import AuthWorkspaceSkeleton from "./skeletons/AuthWorkspaceSkeleton";

/** Full-viewport loading while auth session or route guard resolves. */
export default function FullScreenLoading({ message = "Loading…" }) {
  return <AuthWorkspaceSkeleton caption={message} />;
}
