import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type NamedComponentModule<K extends string, C extends ComponentType<any>> = Record<K, C>;

export function lazyNamed<K extends string, C extends ComponentType<any>>(
  loader: () => Promise<NamedComponentModule<K, C>>,
  exportName: K,
): LazyExoticComponent<C> {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] };
  });
}
