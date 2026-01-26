#!/bin/bash
set -e

RTMP_URL="${1:-rtmp://localhost:1935/live}"
INGEST_KEY="${2:-test-key}"

echo "=== RTMP Test Script ==="
echo "URL: $RTMP_URL"
echo "Key: $INGEST_KEY"
echo ""

echo "=== Test 1: Wrong key (should be rejected) ==="
if timeout 5 ffmpeg -hide_banner -loglevel error \
  -re -f lavfi -i "testsrc=size=320x240:rate=15" \
  -t 2 -c:v libx264 -preset ultrafast -f flv "$RTMP_URL/WRONG_KEY" 2>&1; then
  echo "FAIL: Stream was accepted with wrong key"
  exit 1
else
  echo "PASS: Stream correctly rejected"
fi

echo ""
echo "=== Test 2: Valid key (should be accepted) ==="
timeout 10 ffmpeg -hide_banner -loglevel warning \
  -re -f lavfi -i "testsrc=size=320x240:rate=15" \
  -t 5 -c:v libx264 -preset ultrafast -f flv "$RTMP_URL/$INGEST_KEY"

echo "PASS: Stream accepted with valid key"
echo ""
echo "=== All tests passed ==="
