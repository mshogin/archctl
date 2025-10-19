# Custom Validators Examples

This directory contains examples of custom validators you can add to your DocHub architecture manifests.

## What Are Custom Validators?

Custom validators are JSONata queries that check your architecture for specific rules and patterns. They complement the built-in DocHub validators with project-specific checks.

## Available Examples

### 1. Empty Contexts Validator (`custom.contexts.empty`)
**What it checks:** Contexts that have no components defined.

**Why it's useful:** Empty contexts may indicate incomplete architecture documentation or forgotten sections.

**JSONata pattern:**
```jsonata
[contexts.$spread().(
  $CONTEXT_ID := $keys()[0];
  $COMPONENTS := *.components;

  $not($exists($COMPONENTS)) or $count($COMPONENTS) = 0 ? {
    /* return issue object */
  } : null
)[$]]
```

### 2. Component Naming Convention (`custom.components.naming`)
**What it checks:** Components that don't follow kebab-case naming (lowercase with hyphens).

**Why it's useful:** Enforces consistent naming standards across your architecture.

**Example violations:**
- ❌ `BadComponent` (capital letters)
- ❌ `user_service` (underscore instead of hyphen)
- ✅ `user-service` (correct)
- ✅ `system.backend-api` (correct hierarchical)

### 3. Missing Descriptions (`custom.components.description`)
**What it checks:** Components without a `description` field.

**Why it's useful:** Ensures all components are properly documented.

### 4. Missing Entity Type (`custom.components.entity`)
**What it checks:** Components without an `entity` field.

**Why it's useful:** Entity types help classify components (system, service, database, etc.).

### 5. Orphaned Aspects (`custom.aspects.orphaned`)
**What it checks:** Aspects defined but not used by any component.

**Why it's useful:** Helps clean up unused definitions and catch typos in aspect references.

### 6. Too Many Links (`custom.components.too_many_links`)
**What it checks:** Components with more than N links (default: 10).

**Why it's useful:** Detects potential God Object anti-pattern - components that do too much.

## How to Use

### Option 1: Copy Individual Validators

Add the validator definition to your `dochub.yaml`:

```yaml
rules:
  validators:
    custom.contexts.empty:
      title: Контексты без компонентов
      source: >
        (
          [contexts.$spread().(
            # ... validator code ...
          )]
        )
```

### Option 2: Use the Complete Example

Copy the entire `custom-validators.yaml` as a starting point:

```bash
cp examples/custom-validators.yaml your-workspace/dochub.yaml
```

### Option 3: Import as Separate File

In your main `dochub.yaml`:

```yaml
imports:
  - validators.yaml

# Your architecture definitions...
aspects:
  # ...
```

In `validators.yaml`:
```yaml
rules:
  validators:
    custom.contexts.empty:
      # ...
```

## Testing Custom Validators

Use the CLI to test your validators:

```bash
# Test with example workspace
node src/cli.mjs --workspace examples/test-custom-validators

# Test with your workspace
node src/cli.mjs --workspace /path/to/your/architecture

# Get verbose output to see validator execution
node src/cli.mjs --workspace /path/to/your/architecture --verbose

# Get JSON output for parsing
node src/cli.mjs --workspace /path/to/your/architecture --format json
```

## Creating Your Own Validators

### Basic Structure

```yaml
rules:
  validators:
    your.validator.id:
      title: Validator Title
      source: >
        (
          [collection.$spread().(
            $ID := $keys()[0];
            $ITEM := *;

            /* condition */ ? {
              "uid": "unique-id-" & $ID,
              "title": "Issue title",
              "location": "/architect/path/" & $ID,
              "description": "Detailed description",
              "correction": "How to fix this issue"
            } : null
          )[$]]
        )
```

### JSONata Tips

1. **Access manifest data:**
   - `components` - all components
   - `contexts` - all contexts
   - `aspects` - all aspects
   - `$MANIFEST := $` - store manifest reference

2. **Iterate over collections:**
   ```jsonata
   components.$spread().(
     $ID := $keys()[0];  /* Get component ID */
     $COMP := *;          /* Get component data */
     /* ... checks ... */
   )
   ```

3. **Filter null results:**
   ```jsonata
   [...])[$]  /* Removes null/undefined items */
   ```

4. **Common checks:**
   - `$exists(field)` - check if field exists
   - `$count(array)` - count array items
   - `$length(string)` - string length
   - `value in array` - check if value in array
   - `string ~> /regex/` - regex match

5. **Create issue object:**
   ```jsonata
   {
     "uid": "unique-id",           /* Required: unique identifier */
     "title": "Issue title",       /* Required: short description */
     "location": "/architect/...", /* Required: where the issue is */
     "description": "Details",     /* Optional: detailed explanation */
     "correction": "How to fix"    /* Optional: how to resolve */
   }
   ```

## Examples in Action

Run the test workspace to see all validators in action:

```bash
cd /Users/mshogin/my/archctl
node src/cli.mjs --workspace examples/test-custom-validators
```

Expected output will show:
- ✗ `BadComponent` violates naming convention
- ✗ `BadComponent` has no description
- ✗ `BadComponent` has no entity type
- ✗ `empty-context` has no components

## Resources

- [JSONata Documentation](https://jsonata.org/)
- [DocHub Documentation](https://dochub.info)
- [DocHub Built-in Validators](../metamodel/base.yaml)

## Contributing

Have a useful validator? Consider contributing it back to the examples!

1. Add your validator to `custom-validators.yaml`
2. Add test cases that trigger it
3. Document it in this README
4. Test it with the CLI
