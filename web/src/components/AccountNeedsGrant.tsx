import { useAuth } from "../contexts/AuthContext"
import { Button } from "./core/Button"
import { Flex } from "./core/Flex"

const apiKey = import.meta.env.VITE_AUDIUS_APP_KEY || ""

const signInWithAudius = () => {
  const csrfToken = crypto.randomUUID()

  const originURISafe = encodeURIComponent(window.location.origin)
  const redirectUri = "postMessage"
  const appIdURIParam = `api_key=${encodeURIComponent(apiKey)}`
  const responseModeParam = `response_mode=fragment`
  const display = "popup"
  const effectiveScope = "write"

  const windowOptions =
    "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=375, height=785, top=100, left=100"
  const oauthOrigin = "https://audius.co"
  const oauthURL = `${oauthOrigin}/oauth/auth?scope=${effectiveScope}&state=${csrfToken}&redirect_uri=${redirectUri}&origin=${originURISafe}&${responseModeParam}&${appIdURIParam}&display=${display}`

  const popup = window.open(oauthURL, "Sign In with Audius", windowOptions)

  const p = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        window.removeEventListener("message", listener)
        reject(new Error("Timeout waiting for OAuth response"))
      },
      5 * 60 * 1000,
    ) // 5 minutes
    function listener(event: MessageEvent) {
      if (
        event.origin !== oauthOrigin ||
        event.source !== popup ||
        !event.data.state ||
        !event.data.token
      ) {
        console.log("ignoring message", event)
        return
      }
      if (!popup?.closed) {
        popup?.close()
      }

      if (event.data.state !== csrfToken) {
        reject(new Error("CSRF token mismatch"))
        return
      }

      window.removeEventListener("message", listener)
      clearTimeout(timeout)
      resolve(event.data.token as string)
    }
    window.addEventListener("message", listener)
  })
  return p
}

export function AccountNeedsGrant() {
  const { login } = useAuth()

  const grantPermission = () => {
    signInWithAudius()
      .then(async (token) => {
        await login(token)
      })
      .catch((error) => {
        console.error("Error during Audius OAuth:", error)
      })
  }

  return (
    <Flex direction="column">
      <p>
        The connected wallet matches a user, but the user has not granted
        Phoenix permission.
      </p>
      <Flex justifyContent="space-between" fullWidth>
        <Button size="l" variant="primary" onClick={grantPermission}>
          Grant Permission
        </Button>
      </Flex>
    </Flex>
  )
}
