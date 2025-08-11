import { useEffect, useRef } from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

import type { CloudUserInfo } from "@roo-code/types"
import { TelemetryEventName } from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { vscode } from "@src/utils/vscode"
import { telemetryClient } from "@src/utils/TelemetryClient"

/**
 * Props interface for the AccountView component
 * @param userInfo - User information from the cloud service (null if not authenticated)
 * @param isAuthenticated - Boolean indicating if user is currently authenticated
 * @param cloudApiUrl - Optional URL for the cloud service API
 * @param onDone - Callback function to close the account view
 */
type AccountViewProps = {
	userInfo: CloudUserInfo | null
	isAuthenticated: boolean
	cloudApiUrl?: string
	onDone: () => void
}

/**
 * AccountView Component
 * 
 * This component displays the account management interface for Roo Code users.
 * It handles both authenticated and unauthenticated states, providing:
 * - User profile display when authenticated
 * - Sign-in options when not authenticated
 * - Cloud service benefits explanation
 * - Telemetry tracking for user actions
 * 
 * The component integrates with VSCode's webview messaging system to communicate
 * with the extension host for authentication actions.
 */
export const AccountView = ({ userInfo, isAuthenticated, cloudApiUrl, onDone }: AccountViewProps) => {
	// Translation hook for internationalization
	const { t } = useAppTranslation()
	
	// Ref to track previous authentication state for logout detection
	// This helps us detect when a user successfully logs out to trigger telemetry
	const wasAuthenticatedRef = useRef(false)

	// Construct the URI for the Roo logo image
	// Uses the base URI provided by the extension host
	const rooLogoUri = (window as any).IMAGES_BASE_URI + "/roo-logo.svg"

	/**
	 * Effect to track authentication state changes
	 * 
	 * This effect monitors the authentication state to detect successful logout events.
	 * When a user transitions from authenticated to unauthenticated, we capture
	 * telemetry data for analytics purposes.
	 */
	useEffect(() => {
		if (isAuthenticated) {
			// User is currently authenticated, update our tracking ref
			wasAuthenticatedRef.current = true
		} else if (wasAuthenticatedRef.current && !isAuthenticated) {
			// User just logged out successfully (transition from authenticated to unauthenticated)
			telemetryClient.capture(TelemetryEventName.ACCOUNT_LOGOUT_SUCCESS)
			wasAuthenticatedRef.current = false
		}
	}, [isAuthenticated])

	/**
	 * Handles the "Connect" button click for unauthenticated users
	 * 
	 * Sends telemetry data and triggers the cloud sign-in process
	 * by posting a message to the VSCode extension host.
	 */
	const handleConnectClick = () => {
		// Send telemetry for account connect action
		telemetryClient.capture(TelemetryEventName.ACCOUNT_CONNECT_CLICKED)
		vscode.postMessage({ type: "rooCloudSignIn" })
	}

	/**
	 * Handles the "Logout" button click for authenticated users
	 * 
	 * Sends telemetry data and triggers the cloud sign-out process
	 * by posting a message to the VSCode extension host.
	 */
	const handleLogoutClick = () => {
		// Send telemetry for account logout action
		telemetryClient.capture(TelemetryEventName.ACCOUNT_LOGOUT_CLICKED)
		vscode.postMessage({ type: "rooCloudSignOut" })
	}

	/**
	 * Handles the "Visit Cloud Website" button click
	 * 
	 * Opens the cloud service website in the user's default browser.
	 * Uses the provided cloudApiUrl or falls back to the default Roo Code app URL.
	 */
	const handleVisitCloudWebsite = () => {
		// Send telemetry for cloud website visit
		telemetryClient.capture(TelemetryEventName.ACCOUNT_CONNECT_CLICKED)
		const cloudUrl = cloudApiUrl || "https://app.roocode.com"
		vscode.postMessage({ type: "openExternal", url: cloudUrl })
	}

	return (
		<div className="flex flex-col h-full p-4 bg-vscode-editor-background">
			{/* Header section with title and done button */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-xl font-medium text-vscode-foreground">{t("account:title")}</h1>
				<VSCodeButton appearance="primary" onClick={onDone}>
					{t("settings:common.done")}
				</VSCodeButton>
			</div>
			
			{/* Conditional rendering based on authentication state */}
			{isAuthenticated ? (
				<>
					{/* Authenticated user profile section */}
					{userInfo && (
						<div className="flex flex-col items-center mb-6">
							{/* Profile picture container */}
							<div className="w-16 h-16 mb-3 rounded-full overflow-hidden">
								{userInfo?.picture ? (
									// Display user's profile picture if available
									<img
										src={userInfo.picture}
										alt={t("account:profilePicture")}
										className="w-full h-full object-cover"
									/>
								) : (
									// Fallback to initials avatar if no picture
									<div className="w-full h-full flex items-center justify-center bg-vscode-button-background text-vscode-button-foreground text-xl">
										{userInfo?.name?.charAt(0) || userInfo?.email?.charAt(0) || "?"}
									</div>
								)}
							</div>
							
							{/* User name display */}
							{userInfo.name && (
								<h2 className="text-lg font-medium text-vscode-foreground mb-0">{userInfo.name}</h2>
							)}
							
							{/* User email display */}
							{userInfo?.email && (
								<p className="text-sm text-vscode-descriptionForeground">{userInfo?.email}</p>
							)}
							
							{/* Organization information display */}
							{userInfo?.organizationName && (
								<div className="flex items-center gap-2 text-sm text-vscode-descriptionForeground">
									{userInfo.organizationImageUrl && (
										<img
											src={userInfo.organizationImageUrl}
											alt={userInfo.organizationName}
											className="w-4 h-4 rounded object-cover"
										/>
									)}
									<span>{userInfo.organizationName}</span>
								</div>
							)}
						</div>
					)}
					
					{/* Action buttons for authenticated users */}
					<div className="flex flex-col gap-2 mt-4">
						<VSCodeButton appearance="secondary" onClick={handleVisitCloudWebsite} className="w-full">
							{t("account:visitCloudWebsite")}
						</VSCodeButton>
						<VSCodeButton appearance="secondary" onClick={handleLogoutClick} className="w-full">
							{t("account:logOut")}
						</VSCodeButton>
					</div>
				</>
			) : (
				<>
					{/* Unauthenticated user section */}
					
					{/* Roo logo display for unauthenticated users */}
					<div className="flex flex-col items-center mb-1 text-center">
						<div className="w-16 h-16 mb-1 flex items-center justify-center">
							{/* 
							 * Logo container using CSS masking for proper theming
							 * The logo adapts to the current VSCode theme colors
							 * We use both webkit and standard mask properties for cross-browser compatibility
							 */}
							<div
								className="w-12 h-12 bg-vscode-foreground"
								style={{
									WebkitMaskImage: `url('${rooLogoUri}')`,
									WebkitMaskRepeat: "no-repeat",
									WebkitMaskSize: "contain",
									maskImage: `url('${rooLogoUri}')`,
									maskRepeat: "no-repeat",
									maskSize: "contain",
								}}>
								{/* 
								 * Hidden img element for accessibility
								 * The actual logo is displayed via CSS masking above
								 */}
								<img src={rooLogoUri} alt="Roo logo" className="w-12 h-12 opacity-0" />
							</div>
						</div>
					</div>

					{/* Cloud benefits explanation section */}
					<div className="flex flex-col mb-6 text-center">
						<h2 className="text-lg font-medium text-vscode-foreground mb-2">
							{t("account:cloudBenefitsTitle")}
						</h2>
						<p className="text-md text-vscode-descriptionForeground mb-4">
							{t("account:cloudBenefitsSubtitle")}
						</p>
						
						{/* List of cloud service benefits */}
						<ul className="text-sm text-vscode-descriptionForeground space-y-2 max-w-xs mx-auto">
							<li className="flex items-start">
								<span className="mr-2 text-vscode-foreground">•</span>
								{t("account:cloudBenefitHistory")}
							</li>
							<li className="flex items-start">
								<span className="mr-2 text-vscode-foreground">•</span>
								{t("account:cloudBenefitSharing")}
							</li>
							<li className="flex items-start">
								<span className="mr-2 text-vscode-foreground">•</span>
								{t("account:cloudBenefitMetrics")}
							</li>
						</ul>
					</div>

					{/* Connect button for unauthenticated users */}
					<div className="flex flex-col gap-4">
						<VSCodeButton appearance="primary" onClick={handleConnectClick} className="w-full">
							{t("account:connect")}
						</VSCodeButton>
					</div>
				</>
			)}
		</div>
	)
}
