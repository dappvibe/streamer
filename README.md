# RTMP Streaming Splitter

Production-ready RTMP streaming server that accepts a single input stream and simultaneously forwards it to multiple platforms (X/Twitter, Telegram, YouTube).

## Features

- ✅ Single RTMP input endpoint
- ✅ Simultaneous multi-platform streaming
- ✅ HLS output for monitoring/preview
- ✅ Docker-based deployment
- ✅ Environment-based configuration
- ✅ Minimal resource footprint (Alpine Linux)

## Architecture

```
[OBS/Streaming Client] --RTMP--> [nginx-rtmp] --RTMPS--> [X/Twitter]
                                      |
                                      +--------RTMPS--> [Telegram]
                                      |
                                      +--------RTMPS--> [YouTube]
```

## Quick Start

### 1. Configure Platform Credentials

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your streaming keys for each platform:

```env
# X/Twitter
TWITTER_RTMP_URL=rtmps://live-api.x.com/live
TWITTER_STREAM_KEY=your-twitter-stream-key

# Telegram
TELEGRAM_RTMP_URL=rtmps://dc4-1.rtmp.t.me/s
TELEGRAM_STREAM_KEY=your-telegram-stream-key

# YouTube
YOUTUBE_RTMP_URL=rtmps://a.rtmp.youtube.com/live2
YOUTUBE_STREAM_KEY=your-youtube-stream-key
```

### 2. Start the Server

```bash
docker compose up -d
```

### 3. Configure Your Streaming Software

**OBS Studio:**

- Server: `rtmp://your-server-ip:1935/live`
- Stream Key: `stream` (or any value)

**FFmpeg:**

```bash
ffmpeg -re -i input.mp4 -c copy -f flv rtmp://your-server-ip:1935/live/stream
```

### 4. Monitor Your Stream

- **HLS Preview**: `http://your-server-ip:8080/hls/stream.m3u8`
- **Statistics**: `http://your-server-ip:8080/stat`

## Platform Setup

### X/Twitter

1. Go to [Twitter Media Studio](https://studio.twitter.com/)
2. Navigate to Settings → Live Events
3. Create a new live event
4. Copy the RTMPS URL and Stream Key

### Telegram

1. Start a chat with [@BotFather](https://t.me/BotFather)
2. Create a channel or use existing
3. Get streaming credentials from Telegram
4. Copy the RTMPS URL and Stream Key

### YouTube

1. Go to [YouTube Studio](https://studio.youtube.com/)
2. Click "Go Live"
3. Select "Stream" option
4. Copy the Stream URL and Stream Key from the settings

## Configuration

### nginx.conf

The main configuration file defines:

- RTMP input on port **1935**
- HLS output for monitoring
- Multi-platform push configuration

### Environment Variables

| Variable              | Description             | Example                            |
| --------------------- | ----------------------- | ---------------------------------- |
| `TWITTER_RTMP_URL`    | X/Twitter RTMP endpoint | `rtmps://live-api.x.com/live`      |
| `TWITTER_STREAM_KEY`  | X/Twitter stream key    | `live_xxx`                         |
| `TELEGRAM_RTMP_URL`   | Telegram RTMP endpoint  | `rtmps://dc4-1.rtmp.t.me/s`        |
| `TELEGRAM_STREAM_KEY` | Telegram stream key     | `xxx`                              |
| `YOUTUBE_RTMP_URL`    | YouTube RTMP endpoint   | `rtmps://a.rtmp.youtube.com/live2` |
| `YOUTUBE_STREAM_KEY`  | YouTube stream key      | `xxxx-xxxx-xxxx-xxxx`              |

## Troubleshooting

### Check Logs

```bash
docker compose logs -f nginx-rtmp
```

### Verify nginx Configuration

```bash
docker compose exec nginx-rtmp nginx -t
```

### Test Stream Reception

Use `ffplay` to test the HLS output:

```bash
ffplay http://your-server-ip:8080/hls/stream.m3u8
```

### Common Issues

**Issue:** Stream not pushing to platforms  
**Solution:** Verify stream keys are correct in `.env` file

**Issue:** nginx fails to start  
**Solution:** Check nginx logs for configuration errors

**Issue:** High latency  
**Solution:** Adjust `hls_fragment` value in `nginx.conf` (lower = less latency, more CPU)

## Development

### Rebuild Container

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### View Real-time Statistics

```bash
curl http://localhost:8080/stat
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
