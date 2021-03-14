// import { Router, Request, Response } from 'express';
// // import { FeedRouter } from './feed/routes/feed.router';

// const router: Router = Router();

// router.use('/feed', FeedRouter);
// router.use('/users', UserRouter);

import { Router, Request, Response } from 'express';
import { FeedItem } from './model.index';
import * as AWS from '../../aws';
import { NextFunction } from 'connect';
import * as jwt from 'jsonwebtoken';
import { config } from './../../config/config';

const router: Router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
	if (!req.headers || !req.headers.authorization) {
		return res.status(401).send({ message: 'No authorization headers.' });
	}

	const token_bearer = req.headers.authorization.split(' ');
	if (token_bearer.length != 2) {
		return res.status(401).send({ message: 'Malformed token.' });
	}

	const token = token_bearer[1];
	return jwt.verify(token, config.dev.jwt_secret, (err, decoded) => {
		if (err) {
			console.log(err);
			return res
				.status(500)
				.send({ auth: false, message: 'Failed to authenticate.' });
		}
		return next();
	});
}

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
	const items = await FeedItem.findAndCountAll({ order: [['id', 'DESC']] });
	items.rows.map(item => {
		if (item.url) {
			item.url = AWS.getGetSignedUrl(item.url);
		}
	});
	res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key

router.get('/:id', async (req: Request, res: Response) => {
	const item = await FeedItem.findOne({ where: { id: req.params.id } });
	if (!item) return res.status(404).send('No item found');
	if (item.url) {
		item.url = AWS.getGetSignedUrl(item.url);
	}

	res.status(200).send(item);
});

// update a specific resource
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
	//@TODO try it yourself
	const item = await FeedItem.findOne({ where: { id: req.params.id } });
	if (!item) return res.status(404).send('No item found');

	const caption = req.body.caption;
	const fileName = req.body.url;

	// check Caption is valid
	if (!caption) {
		return res
			.status(400)
			.send({ message: 'Caption is required or malformed' });
	}

	// check Filename is valid
	if (!fileName) {
		return res.status(400).send({ message: 'File url is required' });
	}

	const saved_item = await item.update({ caption: caption, url: fileName });
	res.status(200).send(saved_item);
});

// Get a signed url to put a new item in the bucket
router.get(
	'/signed-url/:fileName',
	requireAuth,
	async (req: Request, res: Response) => {
		let { fileName } = req.params;
		const url = AWS.getPutSignedUrl(fileName);
		res.status(201).send({ url: url });
	}
);

// Post meta data and the filename after a file is uploaded
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/', requireAuth, async (req: Request, res: Response) => {
	const caption = req.body.caption;
	const fileName = req.body.url;

	// check Caption is valid
	if (!caption) {
		return res
			.status(400)
			.send({ message: 'Caption is required or malformed' });
	}

	// check Filename is valid
	if (!fileName) {
		return res.status(400).send({ message: 'File url is required' });
	}

	const item = await new FeedItem({
		caption: caption,
		url: fileName,
	});

	const saved_item = await item.save();

	saved_item.url = AWS.getGetSignedUrl(saved_item.url);
	res.status(201).send(saved_item);
});

export const FeedRouter: Router = router;

export const IndexRouter: Router = router;
