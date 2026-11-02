# Deterministic demo

`npm run demo` materializes a temporary Git repository with two commits:

1. **Base:** permissions are stored in a role registry.
2. **Head:** the same current behavior is implemented with direct role conditionals.

The fixture agent receives the same future requirement on both revisions: add a read-only auditor role. It follows the structure it finds rather than consulting `EVOLVECI_SIDE`.

- On base, it extends one registry file.
- On head, it changes the coupled access function and creates three supporting files.

The deterministic verifier imports the resulting code and checks both the new auditor behavior and an existing admin behavior. This demonstrates the product mechanism without confusing model variance with orchestration correctness.

Generated evidence is written to `demo/output/` and ignored by Git.
