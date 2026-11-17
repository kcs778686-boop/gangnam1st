# Gangnam First

14-page Korean lounge website for Deno Deploy. Production remains at https://gangnam1st.com/full1 behind Amazon CloudFront and Route 53.

## Edit and build

- Shared layout and service pages: `scripts/build.py`.
- Journal articles and FAQs: `scripts/content.py`.
- Styles and browser interactions: `public/assets/site.css` and `site.js`.
- Seven original photos each have exactly one visible placement across the site. Responsive WebP variants are served through `picture`.
- Regenerate HTML with `python scripts/build.py` and commit generated `public/` files too. Python is not needed on Deno Deploy.

## Validate and run

`deno task check`, `deno task test`, and `python scripts/verify.py` (BeautifulSoup required for the offline content check). Run with `deno task start`.

The server preserves root and `/fullsalong` redirects to `/full1`, serves real 404s, supports HEAD and ETag validation, and blocks indexing of origin preview domains. HTML/CSS/JS have a 60-second shared cache lifetime; WebP files are immutable and should receive a new filename if replaced. CloudFront behavior may impose its own cache minimum.
