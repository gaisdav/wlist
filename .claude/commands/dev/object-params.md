# Object Parameters Rule

When creating or editing functions/methods that accept more than one argument, always use a single object parameter (options object / named parameters) instead of a positional argument list.

## Rule

**If a function takes 2 or more arguments → wrap them in a single object.**

```typescript
// ❌ Wrong — positional list
function createUser(name: string, email: string, role: string) {}
createUser('Alice', 'alice@example.com', 'admin');

// ✅ Correct — object parameter
function createUser({ name, email, role }: { name: string; email: string; role: string }) {}
createUser({ name: 'Alice', email: 'alice@example.com', role: 'admin' });
```

## Applies To

- TypeScript / JavaScript functions and methods
- React component callback props
- React Native hooks and utility helpers
- Class methods, arrow functions, async functions

## Exceptions (single positional arg is fine)

- Functions that genuinely take **one** argument
- Standard library / framework overrides where the signature is fixed (e.g., `Array.map(cb)`, lifecycle methods)
- Pure transformers that follow a well-known convention: `(value) => newValue`

## When Reviewing or Writing Code

1. Before writing a new function with multiple params, define a named type or inline object type for the params.
2. When editing an existing function that uses positional args and has 2+ params, refactor its signature to use an object — update all call sites in the same changeset.
3. Prefer named types over inline: extract `type CreateUserParams = { ... }` when the same shape is used more than once.

## TypeScript Pattern

```typescript
type CreateTransactionParams = {
  amount: number;
  categoryId: string;
  accountId: string;
  note?: string;
};

async function createTransaction({ amount, categoryId, accountId, note }: CreateTransactionParams) {
  // ...
}
```
