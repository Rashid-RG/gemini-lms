"use client"
import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"

// Lightweight Intercom loader tied to the signed-in user
function IntercomChat() {
  const { user, isSignedIn } = useUser()
  const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID

  useEffect(() => {
    if (!appId || !isSignedIn) return

    // Inject script once
    const scriptId = "intercom-script"
    const existing = document.getElementById(scriptId)
    if (!existing) {
      const s = document.createElement("script")
      s.id = scriptId
      s.type = "text/javascript"
      s.async = true
      s.src = `https://widget.intercom.io/widget/${appId}`
      document.head.appendChild(s)
    }

    const userData = {
      app_id: appId,
      user_id: user?.id,
      name: user?.fullName || user?.firstName || "User",
      email: user?.primaryEmailAddress?.emailAddress,
    }

    const bootOrUpdate = () => {
      if (typeof window === "undefined") return
      if (window.Intercom) {
        window.Intercom("update", userData)
      } else {
        window.Intercom = function () {
          window.Intercom.c(arguments)
        }
        window.Intercom.q = []
        window.Intercom.c = function (args) {
          window.Intercom.q.push(args)
        }
        window.Intercom("boot", userData)
      }
    }

    // Delay boot until script loads if needed
    if (existing && window.Intercom) {
      bootOrUpdate()
    } else {
      const onLoad = () => bootOrUpdate()
      const target = existing || document.getElementById(scriptId)
      if (target) {
        target.addEventListener("load", onLoad, { once: true })
        // Fallback in case load already fired
        setTimeout(bootOrUpdate, 1500)
      } else {
        setTimeout(bootOrUpdate, 1500)
      }
      return () => {
        if (target) target.removeEventListener("load", onLoad)
      }
    }
  }, [appId, isSignedIn, user?.id, user?.fullName, user?.firstName, user?.primaryEmailAddress?.emailAddress])

  return null
}

export default IntercomChat
