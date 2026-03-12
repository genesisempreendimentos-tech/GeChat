import { useState, useMemo } from 'react';
import { getAllBannerImages } from './ProfileBannerImages';
import { ProfileRandomImages } from './ProfileRandomImages';

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200';

export function ProfileBanner() {
  const allImages = useMemo(() => getAllBannerImages(), []);
  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    if (allImages.length > 0) {
      return allImages[Math.floor(Math.random() * allImages.length)] ?? DEFAULT_BANNER;
    }
    return DEFAULT_BANNER;
  });

  return (
    <div className="relative w-full h-40 md:h-52 rounded-xl overflow-hidden bg-muted">
      <img
        src={bannerUrl}
        alt="Banner do perfil"
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <ProfileRandomImages onSelectImage={setBannerUrl} />
      </div>
    </div>
  );
}
