import { router, type Href } from 'expo-router';

export function push(href: string) {
  router.push(href as Href);
}

export function replace(href: string) {
  router.replace(href as Href);
}

export function back() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
