import schoolCampusImg from '../assets/images/gallery_school_campus_1794560014900.jpg';

const heroStudentCutout = '/assets/aistudio/Untitled_design__3__8a68f8be.png';
const tryoutBannerImg = '/assets/aistudio/Tryout_TKA_b2da72cf.png';
const mlbbBannerImg = '/assets/aistudio/mlbb_ef4632e5.png';

export const APP_IMAGES = {
  hero: heroStudentCutout,
  tryout: tryoutBannerImg,
  esports: mlbbBannerImg,
  campus: schoolCampusImg,
} as const;

export function getGalleryImage(key: string): string {
  if (key === 'tryout') return tryoutBannerImg;
  if (key === 'esports') return mlbbBannerImg;
  if (key === 'hero') return heroStudentCutout;
  return schoolCampusImg;
}
