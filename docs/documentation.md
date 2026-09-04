# TypeDoc Documentation Guide

**Author:** Nirob Mondal

---

## TypeDoc Overview

**TypeDoc** is the industry-standard documentation generator for TypeScript. Unlike traditional JSDoc generators that merely read comments and guess type interfaces, TypeDoc integrates directly with the official TypeScript compiler (`tsc`).

By analyzing the actual AST (Abstract Syntax Tree), TypeDoc extracts exact types, function signatures, interfaces, and inheritance hierarchies, merging them with JSDoc comments to generate a professional, interactive API documentation website.

### Key Capabilities

- **Direct Compiler Integration**: Uses TypeScript's compiler to ensure types in docs are synchronized with the source code.
- **Built-in Client-Side Search**: Generates a fast, search-indexed site out of the box.
- **Zero Type Duplication**: No need to write type annotations inside JSDoc comments. TypeDoc extracts them from TypeScript.
- **Flexible Outputs**: Exports to HTML pages or JSON data.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [TypeScript](https://www.typescriptlang.org/) installed in the project

### Installation Command

Install TypeDoc as a development dependency:

```bash
npm install typedoc --save-dev
```

Verify the installation by checking the version:

```bash
npx typedoc --version
```

---

## Set up & Run

TypeDoc is highly flexible and can be customized via the command line or configuration files.

### 1. Defining Entry Points

TypeDoc requires one or more entry points to parse TypeScript files.

#### Single Entry Point

For a single export entry point (like `src/index.ts`):

```bash
npx typedoc --entryPoints src/index.ts
```

#### Multiple Entry Points

For multiple distinct modules or entry files:

```bash
npx typedoc --entryPoints src/index.ts --entryPoints src/utils.ts
```

### 2. Configuration (`typedoc.json`)

To avoid long command-line commands, create a `typedoc.json` file in the project root:

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "docs",
  "name": "My Project Name"
}
```

If multiple entry points, fill in the array.

### 3. How to Build/Generate Documentation

Generate the documentation by running:

```bash
npx typedoc
```

For convenience, add a documentation script to `package.json`:

```json
{
  "scripts": {
    "build:docs": "typedoc"
  }
}
```

Build the documentation with:

```bash
npm run build:docs
```

### 4. Viewing the Output

Once the documentation builds successfully, it creates a directory (default: `docs/`).

- Open the `docs/index.html` file in a web browser to view the generated site.
- Alternatively, run a local development server to view it:
  ```bash
  npx serve docs
  ```

---

## How to use TypeDoc

TypeDoc reads JSDoc-style comments (which start with `/**` and end with `*/`).

> [!NOTE]
> Standard comments starting with `//` or `/*` are ignored by TypeDoc.

Below are structured TypeScript examples showing how to document specific language constructs and JSDoc tags.

### 1. Functions & Parameters (`@param`, `@returns`, `@throws`, `@example`)

Use `@param` for inputs, `@returns` (or `@return`) for the output, `@throws` (or `@exception`) for expected errors, and `@example` to demonstrate usage.

````typescript
/**
 * Divides one number by another.
 *
 * @param dividend - The number to be divided.
 * @param divisor - The number to divide by (cannot be zero).
 * @returns The quotient of the division.
 * @throws {Error} Thrown if the divisor is zero.
 *
 * @example
 * ```ts
 * const result = divide(10, 2);
 * console.log(result); // Output: 5
 * ```
 */
export function divide(dividend: number, divisor: number): number {
  if (divisor === 0) {
    throw new Error("Divisor cannot be zero.");
  }
  return dividend / divisor;
}
````

### 2. Async Functions

Documenting async functions is identical to normal functions, but TypeDoc automatically detects that the return type is a `Promise`.

```typescript
/**
 * Asynchronously fetches a list of user accounts from the server.
 *
 * @param role - Filter users by their system access role.
 * @returns A promise resolving to an array of matching user objects.
 */
export async function fetchUsersByRole(role: string): Promise<User[]> {
  const response = await fetch(`/api/users?role=${role}`);
  return response.json();
}
```

### 3. Callback Functions

Callback parameters can be documented by detailing their parameters inline inside the callback description.

```typescript
/**
 * Processes list items and executes a handler for each element.
 *
 * @param items - The list of items to process.
 * @param callback - Callback executed for each item.
 *   @param item - The current string item.
 *   @param index - The item's array index.
 *   @returns True to continue, false to break early.
 */
export function processList(
  items: string[],
  callback: (item: string, index: number) => boolean
): void {
  for (let i = 0; i < items.length; i++) {
    if (!callback(items[i], i)) break;
  }
}
```

### 4. Interfaces

Interfaces define the shape of an object. Document the interface itself and each of its properties.

```typescript
/**
 * Configuration options for establishing a database connection.
 */
export interface DatabaseConfig {
  /** The hostname or IP address of the database server. */
  host: string;

  /** The connection port number. */
  port: number;

  /** Optional database schema name. */
  databaseName?: string;
}
```

### 5. Classes & Visibility (`public`, `private`, `protected`, `abstract`)

TypeDoc natively understands TypeScript's visibility modifiers (`public`, `private`, `protected`) and `abstract` classes.

#### Abstract Class Example

```typescript
/**
 * Base abstract class representing an API service.
 *
 * @abstract
 */
export abstract class BaseService {
  /**
   * Unique identifier for the service instance.
   * @protected
   */
  protected serviceId: string;

  constructor(serviceId: string) {
    this.serviceId = serviceId;
  }

  /**
   * Abstract method to perform connection logic.
   * @abstract
   */
  abstract connect(): Promise<void>;
}
```

#### Normal Class Example

```typescript
/**
 * Service implementation for database operations.
 */
export class DatabaseService {
  /**
   * Private cache storage for fast lookup.
   * @private
   */
  private cacheName: string = "db_cache";

  /**
   * Public flag indicating active service.
   */
  public isActive: boolean = false;

  /**
   * Connects to the database server.
   */
  public async connect(): Promise<void> {
    console.log("Connected");
  }
}
```

### 6. Objects (Type Aliases)

Document object types or type aliases to explain the properties of key-value structures.

```typescript
/**
 * Represents geographical coordinates of a location.
 */
export type LocationCoordinate = {
  /** Latitude coordinate value. */
  latitude: number;
  /** Longitude coordinate value. */
  longitude: number;
};
```

### 7. Enums

Document enums and each of their individual members.

```typescript
/**
 * System access permission levels.
 */
export enum UserPermission {
  /** Full system administration rights. */
  Admin = "ADMIN",
  /** Read and write permissions. */
  Write = "WRITE",
  /** Read-only permissions. */
  Read = "READ",
}
```

### 8. Additional Important Tags

To enrich your documentation and improve readability, TypeDoc supports several other standard block and inline tags:

#### A. `@example`

Use `@example` to provide functional code snippets. Multiple example blocks can be added under a single symbol.

````typescript
/**
 * Greets a user by name.
 *
 * @example
 * **Basic Usage:**
 * ```ts
 * greet("Nirob"); // returns "Hello, Nirob!"
 * ```
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
````

#### B. `{@link}` (Inline Link)

Creates inline hyperlinks referencing other classes, methods, or external URLs:

- Link to a class/symbol: `{@link DatabaseService}`
- Link to a method: `{@link DatabaseService.connect}`
- Link with custom display text: `{@link DatabaseService | DB Service}`
- Link to a URL: `{@link https://typedoc.org TypeDoc Official Website}`

---

## Output

When compiling TypeDoc, the generated output in the `docs/` folder contains a complete website structure:

```text
docs/
├── index.html          # Documentation home page (displays your project README.md)
├── modules.html        # Lists all modules/namespaces and entry points
├── classes/            # Subfolder containing individual documentation for each Class
├── interfaces/         # Subfolder containing documentation for Interfaces
├── types/              # Subfolder containing documented Type Aliases
├── enums/              # Subfolder containing documented Enums
└── assets/             # CSS, JavaScript, and search index files
```

### Generated Site Features

1.  **Fully Searchable**: TypeDoc compiles a client-side search index, allowing visitors to search functions, classes, and parameters immediately.
2.  **Navigation Panel**: Left-hand sidebar containing quick links to modules and namespaces.
3.  **Type Relationships**: Automatically shows class inheritance trees and interface implementation graphs.
4.  **Source Code Linking**: Can link directly to lines in your GitHub repository.

---

## Advantages

- **Source of Truth (Single Definition)**: Types are read directly from TypeScript code. If a type updates in the code, it automatically updates in the docs.
- **Reduced Documentation Overhead**: Eliminates JSDoc type annotations. Write clean, readable comments describing _what_ code does, not _how_ it is typed.
- **High Performance Search**: The generated site features zero-latency search capability.
- **Rich Ecosystem**: Supports themes and plugins. For instance, `typedoc-plugin-markdown` allows outputting markdown files instead of HTML, which is perfect for Wikis and GitBook integrations.
- **Cross-Reference Generation**: TypeDoc automatically hyperlinks custom type names used in parameter lists back to their declaration pages.

---

## Disadvantages

- **Compilation Build Step Required**: Documentation must be regenerated on source code changes to keep it in sync.
- **Parsing Overhead**: On huge codebases, generating docs can take time since TypeDoc compiles the code using the TypeScript Compiler.
- **Strict Compiler Dependencies**: Code must be compiling cleanly. Any TypeScript compilation error can halt or break the TypeDoc documentation build.
- **Private/Internal Visibility Limitation**: By default, requires configuration tweaks (`"excludePrivate": false`) when generating documentation for private internal helper functions.

---

## Official Reference

For the complete configuration manual, advanced guides, and custom themes:
**[Official TypeDoc Documentation Website](https://typedoc.org/index.html)**
