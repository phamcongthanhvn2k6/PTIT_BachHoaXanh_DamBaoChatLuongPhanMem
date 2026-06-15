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
        const userIds = [...new Set(rawData.map(q => q.user_id).filter(Boolean))];

        const [products, users] = await Promise.all([
            Product.find({ _id: { $in: productIds } }).select('name').lean(),
            (await import('../models/User.js')).default.find({ _id: { $in: userIds } }).select('avatar email phone').lean()
        ]);

        const productMap = products.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.name }), {});
        const userMap = users.reduce((acc, curr) => ({
            ...acc,
            [curr._id]: {
                avatar: curr.avatar || '',
                email: curr.email || '',
                phone: curr.phone || ''
            }
        }), {});

        const data = rawData.map(q => ({
            ...q,
            id: q._id,
            product_name: productMap[q.product_id] || 'Sản phẩm',
            user_avatar: userMap[q.user_id]?.avatar || '',
            user_email: userMap[q.user_id]?.email || '',
            user_phone: userMap[q.user_id]?.phone || '',
        }));

        return res.json({ success: true, data, meta: { total, page: p, limit: l } });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const update = async (req, res) => {
    try {
        const { status, is_pinned, is_official_answer, answer_content, ai_status, moderated_flag } = req.body;
        const q = await ProductQuestion.findById(req.params.id);
        if (!q) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }

        if (status) q.status = status;
        if (typeof is_pinned === 'boolean') q.is_pinned = is_pinned;
        if (typeof is_official_answer === 'boolean') q.is_official_answer = is_official_answer;
        if (ai_status) q.ai_status = ai_status;
        if (typeof moderated_flag === 'boolean') q.moderated_flag = moderated_flag;

        // If admin updates or overrides the answer content
        if (answer_content !== undefined) {
            const originalContent = q.answer?.content || '';
            const newContent = String(answer_content || '').trim();
            
            q.answer = {
                content: newContent,
                admin_id: req.userId || null,
                admin_name: req.user?.full_name || req.user?.username || 'Lotte Mart Admin',
                answered_at: new Date()
            };

            // If the original source was 'ai', marking as 'mixed' if changed
            if (q.answer_source === 'ai' && originalContent !== newContent) {
                q.answer_source = 'mixed';
            } else if (!q.answer_source) {
                q.answer_source = 'admin';
            }
            
            if (newContent) {
                q.status = 'answered';
                if (q.ai_status === 'pending' || q.ai_status === 'needs_review') {
                    q.ai_status = 'answered';
                }
            }
        }

        // Handle auto-approval via moderation actions
        if (ai_status === 'answered' && q.answer?.content) {
            q.status = 'answered';
        }

        q.reviewed_at = new Date();
        q.reviewed_by = req.userId || null;
        q.moderated_flag = true;

        await q.save();
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

// GET /api/questions/settings
export const getSettings = async (req, res) => {
    try {
        const AdminSetting = req.app.get('models')?.AdminSetting || (await import('../models/Misc.js')).AdminSetting;
        const { getModelList } = await import('../utils/aiClient.js');

        // Fetch settings from Database
        let qaModeDoc = await AdminSetting.findOne({ key: 'qa_mode' }).lean();
        let qaFallbackDoc = await AdminSetting.findOne({ key: 'qa_fallback_to_heuristic' }).lean();
        let qaModelsDoc = await AdminSetting.findOne({ key: 'qa_active_models' }).lean();

        const qa_mode = qaModeDoc ? qaModeDoc.value : 'ai';
        const qa_fallback_to_heuristic = qaFallbackDoc ? qaFallbackDoc.value : true;
        const qa_active_models = qaModelsDoc ? qaModelsDoc.value : getModelList();

        // Calculate statistics for admin display
        const totalPending = await ProductQuestion.countDocuments({ status: 'pending' });
        const totalAnswered = await ProductQuestion.countDocuments({ status: 'answered' });
        const totalNeedsReview = await ProductQuestion.countDocuments({ ai_status: 'needs_review' });
        const totalRejected = await ProductQuestion.countDocuments({ ai_status: 'rejected' });

        return res.json({
            success: true,
            settings: {
                qa_mode,
                qa_fallback_to_heuristic,
                qa_active_models,
                available_models: getModelList(),
            },
            stats: {
                pending: totalPending,
                answered: totalAnswered,
                needs_review: totalNeedsReview,
                rejected: totalRejected,
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/questions/settings
export const updateSettings = async (req, res) => {
    try {
        const AdminSetting = req.app.get('models')?.AdminSetting || (await import('../models/Misc.js')).AdminSetting;
        const { qa_mode, qa_fallback_to_heuristic, qa_active_models } = req.body;

        if (qa_mode && !['ai', 'admin'].includes(qa_mode)) {
            return res.status(400).json({ success: false, message: 'Invalid qa_mode value' });
        }

        // Upsert settings in DB
        if (qa_mode !== undefined) {
            await AdminSetting.findOneAndUpdate(
                { key: 'qa_mode' },
                { key: 'qa_mode', value: qa_mode, label: 'Q&A AI Answer Mode Toggle', group: 'qa_ai' },
                { upsert: true, new: true }
            );
        }

        if (qa_fallback_to_heuristic !== undefined) {
            await AdminSetting.findOneAndUpdate(
                { key: 'qa_fallback_to_heuristic' },
                { key: 'qa_fallback_to_heuristic', value: !!qa_fallback_to_heuristic, label: 'Heuristic Fallback Enabled', group: 'qa_ai' },
                { upsert: true, new: true }
            );
        }

        if (qa_active_models !== undefined) {
            if (!Array.isArray(qa_active_models)) {
                return res.status(400).json({ success: false, message: 'qa_active_models must be an array' });
            }
            await AdminSetting.findOneAndUpdate(
                { key: 'qa_active_models' },
                { key: 'qa_active_models', value: qa_active_models, label: 'Active AI Models Priority List', group: 'qa_ai' },
                { upsert: true, new: true }
            );
        }

        console.log('[AI-QA] Admin updated Q&A Settings:', { qa_mode, qa_fallback_to_heuristic, qa_active_models });

        return res.json({ success: true, message: 'Cập nhật cấu hình Q&A thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
