#!/bin/bash
# Force complete rebuild by removing .next cache
rm -rf /vercel/share/v0-project/.next
echo "Build cache cleared - next build will use source files"
