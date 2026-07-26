import type { APIContext } from 'astro';
import { catalog, liveApps } from '../../data/portfolio';
import { experienceLabel } from '../../data/identity';
import { imageEndpointHeaders } from '../../data/endpoint-headers';
import { getInteriorOgPage, interiorOgPages } from '../../data/interior-og-pages';
import { renderOgCard } from '../../data/og-card';

export function getStaticPaths() {
  return interiorOgPages.map((page) => ({ params: { slug: page.slug } }));
}

export async function GET({ params }: APIContext) {
  const page = getInteriorOgPage(params.slug!);
  if (!page) {
    return new Response('Unknown social card', { status: 404 });
  }

  const png = await renderOgCard({
    eyebrow: page.label,
    title: page.title,
    description: page.description,
    route: page.route,
    accent: page.accent,
    metrics: [
      { label: 'Experience', value: experienceLabel },
      { label: 'Public archive', value: `${catalog.length}+ projects` },
      { label: 'Live systems', value: `${liveApps.length} online` },
    ],
  });

  return new Response(new Uint8Array(png), {
    headers: imageEndpointHeaders('image/png'),
  });
}
