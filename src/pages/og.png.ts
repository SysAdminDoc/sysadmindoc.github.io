import { catalog, liveApps } from '../data/portfolio';
import { careerProfile } from '../data/career';
import { experienceLabel } from '../data/identity';
import { imageEndpointHeaders } from '../data/endpoint-headers';
import { renderOgCard } from '../data/og-card';

export async function GET() {
  const png = await renderOgCard({
    eyebrow: careerProfile.headline,
    title: 'Matt Parker',
    description: careerProfile.operatingNote,
    route: 'portfolio.getparkerai.com',
    metrics: [
      { label: 'Experience', value: experienceLabel },
      { label: 'Public execution', value: `${catalog.length}+ shipped` },
      { label: 'Live proof', value: `${liveApps.length} live apps` },
    ],
  });

  return new Response(new Uint8Array(png), {
    headers: imageEndpointHeaders('image/png'),
  });
}
