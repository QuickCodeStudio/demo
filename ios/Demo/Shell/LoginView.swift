import SwiftUI
import UIKit

private enum AuthMode {
    case signIn
    case forgot
    case sent
    case register
    case created
}

private enum SignInFocus: Hashable {
    case email
    case password
}

struct LoginView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @State private var mode = AuthMode.signIn
    @State private var email = ""
    @State private var password = ""
    @State private var revealPassword = false
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var confirmPassword = ""
    @State private var busy = false
    @State private var failure: String?
    @FocusState private var signInFocus: SignInFocus?

    var body: some View {
        ScreenCanvas {
            GeometryReader { geo in
                let column = min(
                    ShellMetrics.authContentMaxWidth,
                    max(280, geo.size.width - ShellMetrics.screenPadding * 2)
                )
                ScrollView {
                    // Explicit full-width row so Spacers actually expand inside ScrollView.
                    HStack(spacing: 0) {
                        Spacer(minLength: 0)
                        VStack(alignment: .leading, spacing: 22) {
                            VStack(alignment: .leading, spacing: 8) {
                                QcLoadingLogo(width: 200)
                                    .portalGatewayDebugTap()
                                Text(ShellCopy.projectName)
                                    .font(.title2.bold())
                                    .foregroundStyle(Brand.text(colorScheme))
                                GatewayEndpointBadge()
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 12)

                            Group {
                                switch mode {
                                case .signIn:
                                    signInForm
                                case .forgot:
                                    forgotForm
                                case .sent:
                                    sentNote
                                case .register:
                                    registerForm
                                case .created:
                                    createdNote
                                }
                            }
                        }
                        .padding(.vertical, ShellMetrics.screenPadding)
                        .frame(width: column, alignment: .leading)
                        Spacer(minLength: 0)
                    }
                    .frame(width: geo.size.width)
                }
                .scrollDismissesKeyboard(.interactively)
                .scrollBounceBehavior(.basedOnSize)
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                if mode == .signIn, signInFocus == .email {
                    Button("Next") {
                        signInFocus = .password
                    }
                    .fontWeight(.semibold)
                    .disabled(email.isEmpty)
                }
            }
        }
    }

    private var signInForm: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Sign in")
                    .font(.title.bold())
                Text("Sign in to continue to \(ShellCopy.projectName).")
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            GlassPanel {
                VStack(spacing: 16) {
                    FieldLabel(label: "Email") {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($signInFocus, equals: .email)
                            .submitLabel(.next)
                            .onSubmit {
                                if !email.isEmpty {
                                    signInFocus = .password
                                }
                            }
                    }
                    passwordField(label: "Password", text: $password, newPassword: false, signIn: true)
                }
            }
            HStack {
                Spacer()
                Button("Forgot password?") { mode = .forgot }
                    .font(.subheadline.weight(.semibold))
                    .buttonStyle(.plain)
                    .foregroundStyle(Brand.action)
            }
            if let failure, mode == .signIn {
                PortalInlineError(message: failure)
            }
            PrimaryButton(title: busy ? "Signing in…" : "Sign in") { submitSignIn() }
                .disabled(busy || email.isEmpty || password.isEmpty)
            footer(lead: "New here?", action: "Create an account") { mode = .register }
        }
    }

    private var forgotForm: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Forgot your password?")
                    .font(.title.bold())
                Text("Enter the email on your account. We’ll send a reset link if it matches.")
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            GlassPanel {
                EmailField(label: "Email", text: $email)
            }
            if let failure, mode == .forgot {
                PortalInlineError(message: failure)
            }
            PrimaryButton(title: busy ? "Sending…" : "Send instructions") { sendReset() }
                .disabled(busy || email.isEmpty)
            footer(lead: "Remembered it?", action: "Back to sign in") { mode = .signIn }
        }
    }

    private var sentNote: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Check your email")
                    .font(.title.bold())
                Text("If \(email.isEmpty ? "that address" : email) matches an account, a reset link is on its way.")
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            PrimaryButton(title: "Back to sign in") { mode = .signIn }
        }
    }

    private var createdNote: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Confirm your email")
                    .font(.title.bold())
                Text("We created the account for \(email). Confirm the email, then sign in.")
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            PrimaryButton(title: "Back to sign in") { mode = .signIn }
        }
    }

    private var registerForm: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Create your account")
                    .font(.title.bold())
                Text("Confirm your email before you can sign in.")
                    .foregroundStyle(Brand.muted(colorScheme))
            }
            GlassPanel {
                VStack(spacing: 16) {
                    HStack(alignment: .top, spacing: 12) {
                        nameField("First name", text: $firstName)
                        nameField("Last name", text: $lastName)
                    }
                    EmailField(label: "Email", text: $email)
                    passwordField(label: "Password", text: $password, newPassword: true)
                    passwordField(label: "Confirm password", text: $confirmPassword, newPassword: true)
                }
            }
            if !confirmPassword.isEmpty && confirmPassword != password {
                Text("Passwords do not match.")
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
            if let failure, mode == .register {
                PortalInlineError(message: failure)
            }
            PrimaryButton(title: busy ? "Creating…" : "Create account") { register() }
                .disabled(busy || !canRegister)
            footer(lead: "Already have an account?", action: "Sign in") { mode = .signIn }
        }
    }

    private var canRegister: Bool {
        !firstName.isEmpty && !lastName.isEmpty && !email.isEmpty && passwordIsStrong && password == confirmPassword
    }

    private var passwordIsStrong: Bool {
        password.count >= 8
            && password.contains(where: \.isUppercase)
            && password.contains(where: \.isLowercase)
            && password.contains(where: \.isNumber)
            && password.contains { !$0.isLetter && !$0.isNumber }
    }

    private func submitSignIn() {
        guard !busy else { return }
        failure = nil
        busy = true
        Task {
            defer { busy = false }
            do {
                try await session.signIn(email: email, password: password)
            } catch {
                failure = PortalErrors.record(error)
            }
        }
    }

    private func sendReset() {
        guard !busy else { return }
        failure = nil
        busy = true
        Task {
            defer { busy = false }
            do {
                try await session.requestReset(email: email)
                mode = .sent
            } catch {
                failure = PortalErrors.record(error)
            }
        }
    }

    private func register() {
        guard !busy else { return }
        failure = nil
        busy = true
        Task {
            defer { busy = false }
            do {
                try await session.register(email: email, password: password, firstName: firstName, lastName: lastName)
                mode = .created
            } catch {
                failure = PortalErrors.record(error)
            }
        }
    }

    private func passwordField(label: String, text: Binding<String>, newPassword: Bool, signIn: Bool = false) -> some View {
        FieldLabel(label: label) {
            HStack(spacing: 8) {
                passwordControl(label: label, text: text, newPassword: newPassword, signIn: signIn)
                Button {
                    revealPassword.toggle()
                } label: {
                    Image(systemName: revealPassword ? "eye.slash" : "eye")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(revealPassword ? "Hide password" : "Show password")
            }
        }
    }

    @ViewBuilder
    private func passwordControl(label: String, text: Binding<String>, newPassword: Bool, signIn: Bool) -> some View {
        let contentType: UITextContentType = newPassword ? .newPassword : .password
        if revealPassword {
            configured(TextField(label, text: text), contentType: contentType, signIn: signIn)
        } else {
            configured(SecureField(label, text: text), contentType: contentType, signIn: signIn)
        }
    }

    private func configured<V: View>(_ field: V, contentType: UITextContentType, signIn: Bool) -> some View {
        field
            .textContentType(contentType)
            .submitLabel(signIn ? .go : .done)
            .onSubmit {
                guard signIn, !email.isEmpty, !password.isEmpty else { return }
                submitSignIn()
            }
            .modifier(SignInPasswordFocus(enabled: signIn, focus: $signInFocus))
    }

    private func nameField(_ label: String, text: Binding<String>) -> some View {
        FieldLabel(label: label) {
            TextField(label, text: text)
                .textContentType(label == "First name" ? .givenName : .familyName)
        }
    }

    private func footer(lead: String, action: String, go: @escaping () -> Void) -> some View {
        HStack(spacing: 6) {
            Text(lead)
                .foregroundStyle(Brand.muted(colorScheme))
            Button(action, action: go)
                .fontWeight(.semibold)
                .buttonStyle(.plain)
                .foregroundStyle(Brand.action)
        }
        .font(.subheadline)
        .frame(maxWidth: .infinity)
    }
}

private struct SignInPasswordFocus: ViewModifier {
    let enabled: Bool
    let focus: FocusState<SignInFocus?>.Binding

    func body(content: Content) -> some View {
        if enabled {
            content.focused(focus, equals: .password)
        } else {
            content
        }
    }
}
