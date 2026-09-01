import { prisma } from "../lib/prisma.js";
import { HolidayScope, ScheduleEntryStatus, Role } from "@prisma/client";
import { AppError } from "../middleware/errorHandler.js";
import { AuthUser } from "../middleware/auth.js";
import { normalizeDateString } from "../utils/timeUtils.js";

export interface DeclareHolidayInput {
  date: string | Date;
  reason: string;
  scope?: HolidayScope;
  batchId?: string;
}

export interface GetHolidaysFilter {
  date?: string;
  startDate?: string;
  endDate?: string;
  batchId?: string;
}

export class HolidayService {
  /**
   * Declares a holiday and retroactively updates overlapping classes to HOLIDAY status.
   */
  async declareHoliday(input: DeclareHolidayInput, actor: AuthUser) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError(
        "Only departmental administrators can declare holidays.",
        403,
        "FORBIDDEN"
      );
    }

    const holidayDate = new Date(normalizeDateString(input.date));
    const scope = input.scope || HolidayScope.ALL;

    if (scope === HolidayScope.BATCH && !input.batchId) {
      throw new AppError(
        "batchId is required when holiday scope is BATCH.",
        400,
        "VALIDATION_ERROR"
      );
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Holiday record
      const holiday = await tx.holiday.create({
        data: {
          date: holidayDate,
          reason: input.reason,
          scope,
          batchId: scope === HolidayScope.BATCH ? input.batchId : null,
        },
      });

      // 2. Retroactively flag matching schedule entries on that date as HOLIDAY
      const scheduleWhere: any = {
        date: holidayDate,
        status: {
          in: [ScheduleEntryStatus.SCHEDULED, ScheduleEntryStatus.RESCHEDULED],
        },
      };

      if (scope === HolidayScope.BATCH && input.batchId) {
        scheduleWhere.batchId = input.batchId;
      }

      const affectedEntries = await tx.scheduleEntry.findMany({
        where: scheduleWhere,
        include: {
          batch: true,
          course: true,
        },
      });

      if (affectedEntries.length > 0) {
        await tx.scheduleEntry.updateMany({
          where: scheduleWhere,
          data: {
            status: ScheduleEntryStatus.HOLIDAY,
          },
        });
      }

      // 3. Log Audit Trail
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "DECLARE_HOLIDAY",
          entityType: "Holiday",
          entityId: holiday.id,
          ipAddress: "127.0.0.1",
          details: {
            reason: input.reason,
            date: normalizeDateString(holidayDate),
            scope,
            batchId: input.batchId,
            affectedClassesCount: affectedEntries.length,
          },
        },
      });

      return {
        holiday,
        affectedClassesCount: affectedEntries.length,
        message: `Holiday "${input.reason}" declared for ${normalizeDateString(holidayDate)}. ${affectedEntries.length} class(es) marked as Holiday.`,
      };
    });
  }

  /**
   * Deletes a holiday and restores affected schedule entries back to SCHEDULED.
   */
  async deleteHoliday(id: string, actor: AuthUser) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError("Only departmental administrators can remove holidays.", 403, "FORBIDDEN");
    }

    const existingHoliday = await prisma.holiday.findUnique({
      where: { id },
    });

    if (!existingHoliday) {
      throw new AppError("Holiday not found", 404, "NOT_FOUND");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Delete the holiday
      await tx.holiday.delete({
        where: { id },
      });

      // 2. Restore schedule entries on that date with status HOLIDAY back to SCHEDULED
      const scheduleWhere: any = {
        date: existingHoliday.date,
        status: ScheduleEntryStatus.HOLIDAY,
      };

      if (existingHoliday.scope === HolidayScope.BATCH && existingHoliday.batchId) {
        scheduleWhere.batchId = existingHoliday.batchId;
      }

      const restored = await tx.scheduleEntry.updateMany({
        where: scheduleWhere,
        data: {
          status: ScheduleEntryStatus.SCHEDULED,
        },
      });

      // 3. Log Audit Trail
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "DELETE_HOLIDAY",
          entityType: "Holiday",
          entityId: id,
          ipAddress: "127.0.0.1",
          details: {
            reason: existingHoliday.reason,
            date: normalizeDateString(existingHoliday.date),
            restoredClassesCount: restored.count,
          },
        },
      });

      return {
        success: true,
        restoredClassesCount: restored.count,
        message: `Holiday removed. ${restored.count} class(es) restored to Scheduled status.`,
      };
    });
  }

  /**
   * Alias for deleteHoliday for convenience and ubiquitous language.
   */
  async removeHoliday(id: string, actor: AuthUser) {
    return this.deleteHoliday(id, actor);
  }

  /**
   * Gets list of declared holidays.
   */
  async getHolidays(filters: GetHolidaysFilter = {}) {
    const where: any = {};

    if (filters.date) {
      where.date = new Date(normalizeDateString(filters.date));
    } else if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(normalizeDateString(filters.startDate)),
        lte: new Date(normalizeDateString(filters.endDate)),
      };
    }

    if (filters.batchId) {
      where.OR = [{ scope: HolidayScope.ALL }, { batchId: filters.batchId }];
    }

    return await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
      include: {
        batch: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Gets holidays in a specific date range.
   */
  async getHolidaysByDateRange(startDate: string, endDate: string, batchId?: string) {
    return this.getHolidays({ startDate, endDate, batchId });
  }

  /**
   * Checks whether a specific date is a declared holiday.
   * If batchId is provided, checks if it is a holiday for that batch or department-wide.
   */
  async isHolidayDate(date: string | Date, batchId?: string): Promise<boolean> {
    const holidayDate = new Date(normalizeDateString(date));
    const where: any = {
      date: holidayDate,
    };

    if (batchId) {
      where.OR = [{ scope: HolidayScope.ALL }, { batchId }];
    } else {
      where.scope = HolidayScope.ALL;
    }

    const count = await prisma.holiday.count({ where });
    return count > 0;
  }

  /**
   * Gets the upcoming holidays from today onwards.
   */
  async getUpcomingHolidays(limit = 5, batchId?: string) {
    const today = new Date(normalizeDateString(new Date()));
    const where: any = {
      date: { gte: today },
    };

    if (batchId) {
      where.OR = [{ scope: HolidayScope.ALL }, { batchId }];
    }

    return await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
      take: limit,
      include: {
        batch: { select: { id: true, name: true } },
      },
    });
  }
}

export const holidayService = new HolidayService();

