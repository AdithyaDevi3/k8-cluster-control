#!/bin/sh
set -eu

KUBECONFIG_PATH="${KUBECONFIG:-/home/node/.kube/config}"

if [ ! -f "$KUBECONFIG_PATH" ] && [ -n "${KUBERNETES_SERVICE_HOST:-}" ]; then
  TOKEN_PATH=/var/run/secrets/kubernetes.io/serviceaccount/token
  CA_PATH=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
  NAMESPACE_PATH=/var/run/secrets/kubernetes.io/serviceaccount/namespace
  mkdir -p "$(dirname "$KUBECONFIG_PATH")"
  kubectl config set-cluster in-cluster \
    --server="https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT_HTTPS:-443}" \
    --certificate-authority="$CA_PATH" \
    --embed-certs=true \
    --kubeconfig="$KUBECONFIG_PATH" >/dev/null
  kubectl config set-credentials service-account \
    --token="$(cat "$TOKEN_PATH")" \
    --kubeconfig="$KUBECONFIG_PATH" >/dev/null
  kubectl config set-context in-cluster \
    --cluster=in-cluster \
    --user=service-account \
    --namespace="$(cat "$NAMESPACE_PATH")" \
    --kubeconfig="$KUBECONFIG_PATH" >/dev/null
  kubectl config use-context in-cluster --kubeconfig="$KUBECONFIG_PATH" >/dev/null
fi

exec "$@"