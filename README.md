# TODO

- read comments on columns to type with JSDoc instead of common `JSon`
  - add custom types ?
- keep the foreign keys in the ts types :
```ts
interface A {
  id: string;
}
interface B {
  id_a: A['id'] // instead of current `id_a: string`
}
```