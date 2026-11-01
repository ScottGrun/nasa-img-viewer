// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			caches?: {
				default: {
					match(request: Request): Promise<Response | undefined>;
					put(request: Request, response: Response): Promise<void>;
				};
			};
			context?: { waitUntil(promise: Promise<unknown>): void };
		}
	}
}

export {};
