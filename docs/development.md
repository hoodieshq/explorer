## Development

### Creating new UI components

For new components we use [shadcn/ui](https://ui.shadcn.com/docs).

To generate a component, use this script:

```bash
pnpm gen accordion
```

It translates needed component into `pnpx shadcn@version add accordion` and installs it.

### Testing

To not run all the tests you can use this script:

```bash
pnpm t app/path_to/__tests__/test.spec.ts [--watch]
# OR
npm t app/path_to/__tests__/test.spec.ts -- [--watch]
```
