FROM nginx:alpine

# Install sed (usually already available in alpine, but ensure it's there)
RUN apk add --no-cache sed

# Copy the dist folder to nginx html directory
COPY dist/ /usr/share/nginx/html/

# Copy custom nginx configuration template
# nginx:alpine automatically processes .template files using envsubst
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy startup script to conditionally enable no-cache headers
COPY docker-entrypoint.d/20-envsubst-no-cache.sh /docker-entrypoint.d/20-envsubst-no-cache.sh
RUN chmod +x /docker-entrypoint.d/20-envsubst-no-cache.sh

# Expose port 80
EXPOSE 80

# nginx:alpine entrypoint automatically processes templates, then runs scripts in /docker-entrypoint.d/
# Our script will modify the config after template processing if ENABLE_NO_CACHE=true
# No custom CMD needed - uses default nginx entrypoint

