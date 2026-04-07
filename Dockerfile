FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy the server configuration files
COPY package*.json ./

# Install dependecies
RUN npm install --production

# Copy our source code
COPY . .

# Expose our app port standard
EXPOSE 3000

# Set Node Env to production
ENV NODE_ENV=production

# The default Easypanel start command behavior
CMD ["npm", "start"]
