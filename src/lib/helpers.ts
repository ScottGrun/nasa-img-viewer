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

export const stripUnsafeUrlChars = (text: string): string => {
	// Replace all non-alphanumeric characters (except hyphen and underscore) with hyphens
	// Then replace multiple consecutive hyphens with a single hyphen
	// Finally trim any leading or trailing hyphens
	return text
		.replace(/[^a-zA-Z0-9-_]/g, ' ')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
};
