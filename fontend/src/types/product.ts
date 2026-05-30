export interface CompareBadge {
	type?: string;
	text: string;
}

export interface ComparePromotion {
	id: string;
	title: string;
	badge_text?: string;
}

export interface CompareCoupon {
	id: string;
	code: string;
	title?: string;
}

export interface ComparePolicy {
	title: string;
	description: string;
}

export interface CompareProduct {
	id: string;
	product_id: string;
	branch_product_id?: string;
	name: string;
	image?: string;
	images?: string[];
	price?: number | null;
	original_price?: number | null;
	discount_percent?: number | null;
	brand?: string;
	category_name?: string;
	origin?: string;
	expiry_date?: string | null;
	unit?: string;
	weight?: string;
	average_rating?: number;
	rating?: number;
	review_count?: number;
	sold_count?: number;
	badges?: CompareBadge[];
	stock?: number | null;
	in_stock?: boolean;
	short_description?: string;
	description?: string;
	specifications?: Array<{ label: string; value: string }> | Record<string, string>;
	promotions?: ComparePromotion[];
	coupons?: CompareCoupon[];
	policies?: ComparePolicy[];
	shipping_fee_note?: string;
}

export interface CompareAISummary {
	markdown?: string;
	title: string;
	pros: string[];
	cons: string[];
	recommendation: string;
	notes: string[];
}

export interface NormalizedShopProduct {
	id: string;
	name: string;
	price: number;
	original_price: number;
	image: string;
	categoryShop: string;
	rating: number;
	stock: number;
	discount_percent: number;
	isOutOfStock: boolean;
	flashDeal?: Record<string, any> | null;
	endsIn?: string;
	badges: string[];
	product_id?: string;
	branch_product_id?: string;
	images?: string[];
	product?: Record<string, any> | null;
	branchProduct?: Record<string, any> | null;
	source?: Record<string, any>;
	effective_price?: number;
	pricing_source?: string;
	active_hot_deal?: Record<string, any> | null;
	active_promotion?: Record<string, any> | null;
}
