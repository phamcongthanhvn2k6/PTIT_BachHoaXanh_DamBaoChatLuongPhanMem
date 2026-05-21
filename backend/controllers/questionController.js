import ProductQuestion from '../models/ProductQuestion.js';
import Product from '../models/Product.js';

export const listAll = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { question: { $regex: search, $options: 'i' } },
                { user_name: { $regex: search, $options: 'i' } }
            ];
        }

        const p = Math.max(1, parseInt(page));
        const l = Math.min(100, Math.max(1, parseInt(limit)));

        const total = await ProductQuestion.countDocuments(filter);
        const rawData = await ProductQuestion.find(filter).sort('-created_at').skip((p - 1) * l).limit(l).lean();

        const productIds = [...new Set(rawData.map(q => q.product_id).filter(Boolean))];
        const products = await Product.find({ _id: { $in: productIds } }).select('name').lean();
        const productMap = products.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.name }), {});

        const data = rawData.map(q => ({
            ...q,
            id: q._id,
            product_name: productMap[q.product_id] || 'Sản phẩm',
        }));

        return res.json({ success: true, data, meta: { total, page: p, limit: l } });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const update = async (req, res) => {
    try {
        const { status, is_pinned, is_official_answer } = req.body;
        const updateData = {};
        if (status) updateData.status = status;
        if (typeof is_pinned === 'boolean') updateData.is_pinned = is_pinned;
        if (typeof is_official_answer === 'boolean') updateData.is_official_answer = is_official_answer;

        const q = await ProductQuestion.findByIdAndUpdate(req.params.id, updateData, { new: true });
        return res.json({ success: true, data: q });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const remove = async (req, res) => {
    try {
        await ProductQuestion.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: 'Đã xóa câu hỏi' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
