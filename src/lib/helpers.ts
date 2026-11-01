export const formatExifDate = (dateString?: string) => {
	if (!dateString) return undefined;

	const [datePart] = dateString.split(' ');
	const [year, month, day] = datePart.split(':');

	const date = new Date(Number(year), Number(month) - 1, Number(day));

	return date.toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});
};
