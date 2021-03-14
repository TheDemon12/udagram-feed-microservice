import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
	dsn:
		'https://6bc66d8dea8c4776b014f08b4a4e9955@o393985.ingest.sentry.io/5652496',

	// We recommend adjusting this value in production, or using tracesSampler
	// for finer control
	tracesSampleRate: 1.0,
});
