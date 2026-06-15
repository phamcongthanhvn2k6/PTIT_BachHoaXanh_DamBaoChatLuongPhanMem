import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { GamificationCampaign, GamificationLog } from '../models/Gamification.js';

// Connect to MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lottemart';
mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const campaigns = await GamificationCampaign.find().lean();
    console.log('Campaigns count:', campaigns.length);
    campaigns.forEach(c => {
      console.log('Campaign details:', JSON.stringify(c, null, 2));
    });
    
    const logs = await GamificationLog.find().lean();
    console.log('Logs count:', logs.length);
    if (logs.length > 0) {
      console.log('Sample Log:', JSON.stringify(logs[0], null, 2));
      console.log(`campaign_id type=${typeof logs[0].campaign_id}, isObjectId=${logs[0].campaign_id instanceof mongoose.Types.ObjectId}`);
      
      const campaign_id = String(logs[0].campaign_id);
      const totalParticipation = await GamificationLog.countDocuments({ campaign_id });
      console.log('countDocuments with raw string campaign_id:', totalParticipation);
      
      const totalParticipationWithObjectId = await GamificationLog.countDocuments({ campaign_id: new mongoose.Types.ObjectId(campaign_id) });
      console.log('countDocuments with ObjectId cast campaign_id:', totalParticipationWithObjectId);

      const totalParticipationWithParsedId = await GamificationLog.countDocuments({ campaign_id: mongoose.Types.ObjectId.createFromHexString ? mongoose.Types.ObjectId.createFromHexString(campaign_id) : new mongoose.Types.ObjectId(campaign_id) });
      console.log('countDocuments with parsed ObjectId:', totalParticipationWithParsedId);
      
      // Check unique campaign IDs in logs
      const campIdsInLogs = [...new Set(logs.map(l => String(l.campaign_id)))];
      console.log('Unique Campaign IDs in logs:', campIdsInLogs);
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
