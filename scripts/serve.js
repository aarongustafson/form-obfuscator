import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = new Map([
	['.css', 'text/css'],
	['.html', 'text/html'],
	['.js', 'text/javascript'],
	['.json', 'application/json'],
]);

createServer(async (request, response) => {
	response.setHeader('cache-control', 'no-store');
	if (!['GET', 'HEAD'].includes(request.method)) {
		response.writeHead(405, { Allow: 'GET, HEAD' }).end();
		return;
	}
	try {
		const pathname = decodeURIComponent(
			new URL(request.url, 'http://localhost').pathname,
		);
		const segments = pathname.split('/');
		if (segments.some((segment) => segment.startsWith('.'))) {
			response.writeHead(403).end();
			return;
		}
		const path = await realpath(resolve(root, `.${pathname}`));
		if (
			!path.startsWith(`${resolve(root)}${sep}`) ||
			path.includes(`${sep}node_modules${sep}`)
		) {
			response.writeHead(403).end();
			return;
		}
		if (!(await stat(path)).isFile()) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			'content-type':
				types.get(extname(path)) || 'application/octet-stream',
			'x-content-type-options': 'nosniff',
		});
		if (request.method === 'HEAD') response.end();
		else
			createReadStream(path)
				.on('error', (error) => response.destroy(error))
				.pipe(response);
	} catch (error) {
		response
			.writeHead(
				error instanceof URIError || error.code === 'ERR_INVALID_URL'
					? 400
					: ['ENOENT', 'ENOTDIR'].includes(error.code)
						? 404
						: 500,
			)
			.end();
	}
}).listen(Number(process.env.PORT || 4189), '127.0.0.1', () => {
	console.log(
		`No-cache preview: http://127.0.0.1:${process.env.PORT || 4189}/demo/index.html`,
	);
});
