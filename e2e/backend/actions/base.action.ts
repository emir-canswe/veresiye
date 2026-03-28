import type { APIRequestContext } from '@playwright/test';

export abstract class BaseAction {
  constructor(protected readonly request: APIRequestContext) {}
}
