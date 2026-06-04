import httpClient from '../api/httpClient';
import { dataService } from './dataService';

export const eventService = {
  getFeaturedEvents: async () => {
    try {
      const res = await httpClient.get('/events/published');
      return res.data?.data || res.data || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  getEventDetail: async (slug: string) => {
    try {
      const res = await httpClient.get(`/events/${slug}`);
      return res.data?.data || res.data || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  },

  listPublished: () => dataService.getEventPosts(),
  listAll: () => dataService.getAllEventPosts(),
  listFeatured: () => dataService.getFeaturedEventPosts(),
  getById: (id: string | number) => dataService.getEventPost(id),
  getBySlug: (slug: string) => dataService.getEventPostBySlug(slug),
  getDetail: (id: string | number) => dataService.getEventPostDetail(id),
  create: (payload: Record<string, unknown>) => dataService.createEventPost(payload),
  update: (id: string | number, payload: Record<string, unknown>) => dataService.updateEventPost(id, payload),
  remove: (id: string | number) => dataService.deleteEventPost(id),
  publish: (id: string | number) => dataService.publishEventPost(id),
  unpublish: (id: string | number) => dataService.unpublishEventPost(id),
  toggleFeatured: (id: string | number) => dataService.toggleEventFeatured(id),
  bulkDelete: (ids: Array<string | number>) => dataService.bulkDeleteEvents(ids),
  listCategories: () => dataService.getEventCategories(),
  listComments: (postId: number) => dataService.getEventComments(postId),
  addComment: (payload: any) => dataService.addEventComment(payload),
  listRelated: (postId: number | string) => dataService.getRelatedEventPosts(postId),
};
