# Shinon Validator

This directory contains a standalone validator for commit‑message templates following the Shinon concept:

- A single template file is the source of truth for commit messages.
- The validator reads the template and runs a set of independent rule classes.
- Each rule produces structured findings (error code, line, message).
- The validator exits with code 0 on success, non‑zero on failure, printing all findings.

## Usage

```bash
# Validate a template file
npx ts-node scripts/shinon-validate.sh path/to/commit-template.txt

# Run the built‑in self‑test (uses known good/bad examples)
npx ts-node scripts/shinon-validate.sh --self-test
```

## Extending the Validator

Add new rules by subclassing `Rule` and implementing the `validate(lines:string[]): RuleFinding[]` method. Then add an instance to the `rules` array in the `Gate` constructor inside `shinon-validate.ts`.

Example rule that forbids the word “TODO”:

```typescript
class NoTodoRule extends Rule {
  validate(lines: string[]): RuleFinding[] {
    const findings: RuleFinding[] = [];
    lines.forEach((line, idx) => {
      if (/TODO/i.test(line)) {
        findings.push({
          code: 'T01',
          message: 'Line contains the forbidden word TODO.',
          line: idx + 1,
          excerpt: line,
        });
      }
    });
    return findings;
  }
}
```

## Design Notes

- The validator is intentionally framework‑agnostic; it does not presume any particular commit convention (e.g., Conventional Commits). Rules encode the policy you want to enforce.
- Because each rule is isolated, you can unit‑test them independently.
- The self‑test mode demonstrates how to verify that your rules fire as expected.

## Running on Windows

The script is written in TypeScript and uses only standard Node.js APIs, so it works on Windows, macOS, and Linux with a recent Node.js installation (`npx ts-node` or compile to JavaScript first).
