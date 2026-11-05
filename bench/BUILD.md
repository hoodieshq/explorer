> Gzipped first-load sizes from `.next/diagnostics/route-bundle-stats.json`, rounded to reduce noise; a cell keeps its previous value while fresh bytes round within one step of it. `Size` is First Load JS minus the chunks shared by all routes; routes with no client JS show `—`.

| Type | Route | Size | First Load JS |
|------|-------|------|---------------|
| Static | `/` | 90 kB | 550 kB |
| Static | `/_not-found` | 0 B | 460 kB |
| Dynamic | `/address/[address]` | 390 kB | 840 kB |
| Dynamic | `/address/[address]/account-data` | 400 kB | 850 kB |
| Dynamic | `/address/[address]/anchor-account` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/attestation` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/attributes` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/blockhashes` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/compression` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/concurrent-merkle-tree` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/domains` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/entries` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/feature-gate` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/idl` | 480 kB | 930 kB |
| Dynamic | `/address/[address]/metadata` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/nftoken-collection-nfts` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/program-multisig` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/rewards` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/security` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/slot-hashes` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/stake-history` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/subscriptions` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/token-extensions` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/tokens` | 370 kB | 820 kB |
| Dynamic | `/address/[address]/transfers` | 370 kB | 820 kB |
| Dynamic | `/address/[address]/verified-build` | 360 kB | 810 kB |
| Dynamic | `/address/[address]/vote-history` | 360 kB | 810 kB |
| Dynamic | `/api/ans-domains/[address]` | — | — |
| Dynamic | `/api/domain-info/[domain]` | — | — |
| Dynamic | `/api/geo-location` | — | — |
| Dynamic | `/api/idl-latest` | — | — |
| Dynamic | `/api/log-drain` | — | — |
| Dynamic | `/api/metadata/proxy` | — | — |
| Dynamic | `/api/ping/[network]` | — | — |
| Dynamic | `/api/search` | — | — |
| Dynamic | `/api/security-txt` | — | — |
| Dynamic | `/api/slot-time` | — | — |
| Dynamic | `/api/sns-domains/[address]` | — | — |
| Dynamic | `/api/stake-rewards/[address]` | — | — |
| Dynamic | `/api/supply` | — | — |
| Dynamic | `/api/token-image/[mintAddress]` | — | — |
| Dynamic | `/api/token-info` | — | — |
| Dynamic | `/api/token-market-data/[address]` | — | — |
| Dynamic | `/api/token-price/[mintAddress]` | — | — |
| Dynamic | `/api/verification/coingecko/[address]` | — | — |
| Dynamic | `/api/verification/jupiter/[mintAddress]` | — | — |
| Dynamic | `/api/verification/rugcheck/[mintAddress]` | — | — |
| Dynamic | `/block/[slot]` | 140 kB | 580 kB |
| Dynamic | `/block/[slot]/accounts` | 140 kB | 580 kB |
| Dynamic | `/block/[slot]/programs` | 140 kB | 580 kB |
| Dynamic | `/block/[slot]/rewards` | 130 kB | 570 kB |
| Dynamic | `/epoch/[epoch]` | 20 kB | 470 kB |
| Static | `/feature-gates` | 10 kB | 470 kB |
| Dynamic | `/mcp` | — | — |
| Static | `/mcp/start` | 20 kB | 480 kB |
| Dynamic | `/og/account/[address]` | — | — |
| Dynamic | `/og/feature-gate/[address]` | — | — |
| Dynamic | `/og/receipt/[signature]` | — | — |
| Dynamic | `/og/tx/[signature]` | — | — |
| Static | `/opengraph-image.png` | — | — |
| Dynamic | `/robots.txt` | — | — |
| Static | `/tos` | 10 kB | 460 kB |
| Dynamic | `/tx/[signature]` | 430 kB | 870 kB |
| Dynamic | `/tx/[signature]/inspect` | 430 kB | 880 kB |
| Static | `/tx/inspector` | 430 kB | 880 kB |