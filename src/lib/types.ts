// Types were generate by ChatGPT based on the API docs defined in this PDF https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf

// General types
export type MediaType = 'image' | 'video' | 'audio';

export interface SearchParams {
	q?: string;
	center?: string;
	description?: string;
	description_508?: string;
	keywords?: string;
	location?: string;
	media_type?: MediaType | MediaType[];
	nasa_id?: string;
	page?: number;
	page_size?: number;
	photographer?: string;
	secondary_creator?: string;
	title?: string;
	year_start?: string; // YYYY
	year_end?: string; // YYYY
}

export interface SearchResultData {
	center: string;
	date_created: string; // ISO 8601 format
	description: string;
	keywords: string[];
	media_type: MediaType;
	nasa_id: string;
	title: string;
}

export interface Link {
	href: string;
	rel: string;
	render?: MediaType;
	prompt?: string;
}

export interface SearchResultItem {
	data: SearchResultData[];
	href: string;
	links: Link[];
}

export interface CollectionMetadata {
	total_hits: number;
}

export interface SearchResponse {
	collection: {
		href: string;
		items: SearchResultItem[];
		links: Link[];
		metadata: CollectionMetadata;
		version: string;
	};
}

export interface AssetManifestItem {
	href: string;
}

export interface AssetManifestResponse {
	collection: {
		href: string;
		items: AssetManifestItem[];
		version: string;
	};
}

export interface MetadataLocationResponse {
	location: string;
}

export interface CaptionsLocationResponse {
	location: string;
}

export interface AlbumParams {
	album_name: string;
	page?: number;
}

export interface AlbumItemData {
	nasa_id: string;
	album: string[];
	keywords: string[];
	title: string;
	media_type: MediaType;
	date_created: string; // ISO 8601 format
	center: string;
	description: string;
}

export interface AlbumItem {
	data: AlbumItemData[];
	href: string;
	links: Link[];
}

export interface AlbumResponse {
	collection: {
		href: string;
		items: AlbumItem[];
		links: Link[];
		metadata: CollectionMetadata;
		version: string;
	};
}

// There aren't really docs for what can be in this response so I just converted the example response
// into a type and made everything optional
export interface MetadataResponse {
	'ICC_Profile:ConnectionSpaceIlluminant'?: string;
	'Photoshop:DisplayedUnitsX'?: string;
	'AVAIL:DateCreated'?: string;
	'EXIF:Software'?: string;
	'EXIF:SamplesPerPixel'?: number;
	'EXIF:ExifImageHeight'?: number;
	'AVAIL:Description508'?: string;
	'File:FileInodeChangeDate'?: string;
	'File:MIMEType'?: string;
	'ICC_Profile:ViewingCondIlluminant'?: string;
	'XMP:HistoryParameters'?: string[];
	'File:EncodingProcess'?: string;
	'ICC_Profile:ProfileClass'?: string;
	'ICC_Profile:MeasurementObserver'?: string;
	'AVAIL:Center'?: string;
	'AVAIL:Keywords'?: string[];
	'XMP:HistoryChanged'?: string[];
	'IPTC:Keywords'?: string[];
	'ICC_Profile:ViewingCondIlluminantType'?: string;
	'ICC_Profile:PrimaryPlatform'?: string;
	'XMP:Subject'?: string[];
	'File:FilePermissions'?: string;
	'EXIF:ModifyDate'?: string;
	'File:BitsPerSample'?: number;
	'ICC_Profile:BlueMatrixColumn'?: string;
	'Composite:ThumbnailImage'?: string;
	'AVAIL:Title'?: string;
	'ICC_Profile:Technology'?: string;
	'EXIF:ImageHeight'?: number;
	'XMP:CreatorTool'?: string;
	'XMP:MetadataDate'?: string;
	'XMP:HistoryInstanceID'?: string[];
	'ICC_Profile:ProfileCreator'?: string;
	'APP14:APP14Flags0'?: string;
	'File:ColorComponents'?: number;
	'Photoshop:IPTCDigest'?: string;
	'XMP:HistoryWhen'?: string[];
	'XMP:DerivedFromDocumentID'?: string;
	'ICC_Profile:DeviceMfgDesc'?: string;
	'Photoshop:YResolution'?: number;
	'Composite:DateTimeOriginal'?: string;
	'XMP:XMPToolkit'?: string;
	'XMP:LegacyIPTCDigest'?: string;
	'XMP:ICCProfileName'?: string;
	'XMP:DerivedFromOriginalDocumentID'?: string;
	'AVAIL:Owner'?: string;
	'EXIF:Compression'?: string;
	'ICC_Profile:DeviceModelDesc'?: string;
	'ICC_Profile:MeasurementFlare'?: string;
	'EXIF:ExifVersion'?: string;
	'IPTC:TimeCreated'?: string;
	'ICC_Profile:RedMatrixColumn'?: string;
	'ICC_Profile:BlueTRC'?: string;
	'EXIF:ImageWidth'?: number;
	'Photoshop:ProgressiveScans'?: string;
	'IPTC:DateCreated'?: string;
	'File:FileModifyDate'?: string;
	'ICC_Profile:DeviceAttributes'?: string;
	'XMP:Marked'?: boolean;
	'XMP:InstanceID'?: string;
	'EXIF:XResolution'?: number;
	'EXIF:PhotometricInterpretation'?: string;
	'File:ImageWidth'?: number;
	'ICC_Profile:MeasurementIlluminant'?: string;
	'AVAIL:Album'?: string[];
	'XMP:OriginalDocumentID'?: string;
	'XMP:ModifyDate'?: string;
	'ICC_Profile:ColorSpaceData'?: string;
	'Photoshop:GlobalAltitude'?: number;
	'XMP:Title'?: string;
	'ICC_Profile:GreenTRC'?: string;
	'APP14:APP14Flags1'?: string;
	'IPTC:ApplicationRecordVersion'?: number;
	'XMP:Format'?: string;
	'ICC_Profile:ProfileConnectionSpace'?: string;
	'EXIF:ColorSpace'?: string;
	'ICC_Profile:ProfileVersion'?: string;
	'XMP:CreateDate'?: string;
	'APP14:DCTEncodeVersion'?: number;
	'File:FileSize'?: string;
	'IPTC:ObjectName'?: string;
	'ICC_Profile:MeasurementGeometry'?: string;
	'EXIF:ImageDescription'?: string;
	'IPTC:CodedCharacterSet'?: string;
	'ICC_Profile:RenderingIntent'?: string;
	'ICC_Profile:ViewingCondDesc'?: string;
	'AVAIL:Description'?: string;
	'ICC_Profile:DeviceModel'?: string;
	'XMP:ColorMode'?: string;
	'ICC_Profile:ProfileCMMType'?: string;
	'Photoshop:DisplayedUnitsY'?: string;
	'XMP:DateCreated'?: string;
	'XMP:Description'?: string;
	'ICC_Profile:ProfileID'?: number;
	'ICC_Profile:MediaBlackPoint'?: string;
	'ICC_Profile:Luminance'?: string;
	'EXIF:ThumbnailLength'?: number;
	'File:FileAccessDate'?: string;
	'EXIF:ResolutionUnit'?: string;
	SourceFile?: string;
	'ICC_Profile:MediaWhitePoint'?: string;
	'Composite:DateTimeCreated'?: string;
	'Composite:ImageSize'?: string;
	'AVAIL:SecondaryCreator'?: string;
	'AVAIL:NASAID'?: string;
	'ICC_Profile:ViewingCondSurround'?: string;
	'Photoshop:CopyrightFlag'?: boolean;
	'XMP:HistorySoftwareAgent'?: string[];
	'ICC_Profile:RedTRC'?: string;
	'ICC_Profile:ProfileFileSignature'?: string;
	'ICC_Profile:DeviceManufacturer'?: string;
	'ICC_Profile:MeasurementBacking'?: string;
	'IPTC:Caption-Abstract'?: string;
	'Photoshop:XResolution'?: number;
	'ICC_Profile:CMMFlags'?: string;
	'File:YCbCrSubSampling'?: string;
	'File:CurrentIPTCDigest'?: string;
	'File:FileName'?: string;
	'Photoshop:PhotoshopFormat'?: string;
	'EXIF:BitsPerSample'?: string;
	'Photoshop:PhotoshopThumbnail'?: string;
	'XMP:DocumentID'?: string;
	'File:ImageHeight'?: number;
	'APP14:ColorTransform'?: string;
	'EXIF:ExifImageWidth'?: number;
	'AVAIL:Location'?: string;
	'Photoshop:GlobalAngle'?: number;
	'AVAIL:MediaType'?: string;
	'AVAIL:Photographer'?: string;
	'EXIF:Orientation'?: string;
	'XMP:HistoryAction'?: string[];
	'Photoshop:PhotoshopQuality'?: number;
	'File:ExifByteOrder'?: string;
	'ICC_Profile:ProfileCopyright'?: string;
	'ICC_Profile:ProfileDateTime'?: string;
	'XMP:DerivedFromInstanceID'?: string;
	'EXIF:PlanarConfiguration'?: string;
	'File:FileType'?: string;
	'EXIF:YResolution'?: number;
	'ExifTool:ExifToolVersion'?: number;
	'ICC_Profile:ProfileDescription'?: string;
	'ICC_Profile:GreenMatrixColumn'?: string;
	'EXIF:ThumbnailOffset'?: number;
	'EXIF:DateTimeOriginal'?: string;
}
