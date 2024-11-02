export const fetchFromNasaApi = async (path: string) => {
	const formattedPath = path[0] === '/' ? path : `/${path}`;
	const data = await fetch(`https://images-api.nasa.gov${formattedPath}`);

	if (!data.ok) {
		return { message: 'failed to get response', error: data.status };
	}
	return await data.json();
};
