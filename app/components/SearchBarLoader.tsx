'use client';

import dynamic from 'next/dynamic';

export const SearchBar = dynamic(() => import('@features/search').then(mod => ({ default: mod.SearchBar })), {
    ssr: false,
});
