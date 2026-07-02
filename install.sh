#!/usr/bin/env bash
set -e

if command -v brew >/dev/null 2>&1; then
  echo "Installing Docker, kubectl, and kind via Homebrew..."
  brew install docker kubectl kind || true
  echo "Install finished. Docker and kubectl may already be installed."
  echo "If Docker Desktop is needed, install from https://www.docker.com/products/docker-desktop"
  echo "To create a local cluster: kind create cluster --name demo-cluster"
else
  echo "Homebrew is required for this install script."
  echo "Install Homebrew first: https://brew.sh"
  exit 1
fi
