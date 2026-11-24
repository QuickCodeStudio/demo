import SwiftUI
import QuickCodeHTTP
import IdentityClient

struct IdentityModuleAspNetUserFormView: View {
    @Environment(SessionStore.self) private var session
    @Environment(PortalToast.self) private var toast
    @Environment(\.dismiss) private var dismiss
    var keys: [String] = []
    @State private var loaded = false
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var permissionGroupName = ""
    @State private var userName = ""
    @State private var normalizedUserName = ""
    @State private var email = ""
    @State private var normalizedEmail = ""
    @State private var emailConfirmed = false
    @State private var phoneNumber = ""
    @State private var phoneNumberConfirmed = false
    @State private var twoFactorEnabled = false
    @State private var lockoutEnd = Date()
    @State private var lockoutEnabled = false
    @State private var accessFailedCount = ""
    @State private var photoUrl = ""
    @State private var busy = false
    @State private var failure: String?

    private var ready: Bool { true }

    var body: some View {
                Group {
            if !keys.isEmpty, !loaded {
                LoadingState()
            } else {ScreenCanvas {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    FieldLabel(label: "first Name") { TextField("first Name", text: $firstName) }
                    FieldLabel(label: "last Name") { TextField("last Name", text: $lastName) }
                    PortalForeignKeyField(label: "permission Group Name", module: "identity-module", model: "permission-groups", text: $permissionGroupName)
                    FieldLabel(label: "user Name") { TextField("user Name", text: $userName) }
                    FieldLabel(label: "normalized User Name") { TextField("normalized User Name", text: $normalizedUserName) }
                    FieldLabel(label: "email") { TextField("email", text: $email) }
                    FieldLabel(label: "normalized Email") { TextField("normalized Email", text: $normalizedEmail) }
                    SwitchField(label: "email Confirmed", isOn: $emailConfirmed)
                    FieldLabel(label: "phone Number") { TextField("phone Number", text: $phoneNumber) }
                    SwitchField(label: "phone Number Confirmed", isOn: $phoneNumberConfirmed)
                    SwitchField(label: "two Factor Enabled", isOn: $twoFactorEnabled)
                    DateField(label: "lockout End", date: $lockoutEnd)
                    SwitchField(label: "lockout Enabled", isOn: $lockoutEnabled)
                    NumberField(label: "access Failed Count", text: $accessFailedCount)
                    MediaUploadField(label: "photo Url", kind: .image, text: $photoUrl)
                    if let failure {
                        Text(failure).foregroundStyle(.red)
                    }
                    PrimaryButton(title: busy ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(busy || !ready)
                }
                .padding(ShellMetrics.screenPadding)
            }
        }
            }
        }
        .navigationTitle(keys.isEmpty ? "Asp Net Users" : "Edit")
        .task { await loadExisting() }
    }

    private func save() async {
        busy = true
        failure = nil
        do {
            if keys.isEmpty {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUsersInsert(body: .json(.init(value1: .init(
                id: "",
                firstName: firstName,
                lastName: lastName,
                permissionGroupName: permissionGroupName,
                userName: userName,
                normalizedUserName: normalizedUserName,
                email: email,
                normalizedEmail: normalizedEmail,
                emailConfirmed: emailConfirmed,
                phoneNumber: phoneNumber,
                phoneNumberConfirmed: phoneNumberConfirmed,
                twoFactorEnabled: twoFactorEnabled,
                lockoutEnd: lockoutEnd,
                lockoutEnabled: lockoutEnabled,
                accessFailedCount: Int32(accessFailedCount) ?? 0,
                photoUrl: photoUrl
            ))))
            guard case .created = output else { throw APIFailure.from(status: 0) }
            } else {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUsersUpdate(path: .init(id: keys[0]), body: .json(.init(value1: .init(
                id: keys[0],
                firstName: firstName,
                lastName: lastName,
                permissionGroupName: permissionGroupName,
                userName: userName,
                normalizedUserName: normalizedUserName,
                email: email,
                normalizedEmail: normalizedEmail,
                emailConfirmed: emailConfirmed,
                phoneNumber: phoneNumber,
                phoneNumberConfirmed: phoneNumberConfirmed,
                twoFactorEnabled: twoFactorEnabled,
                lockoutEnd: lockoutEnd,
                lockoutEnabled: lockoutEnabled,
                accessFailedCount: Int32(accessFailedCount) ?? 0,
                photoUrl: photoUrl
            ))))
            guard case .ok = output else { throw APIFailure.from(status: 0) }
            }
            toast.show("Saved")
            dismiss()
        } catch {
            failure = PortalErrors.record(error)
        }
        busy = false
    }

    private func loadExisting() async {
        guard !keys.isEmpty, !loaded else {
            loaded = true
            return
        }
        do {
            let client = makeClient(authorizer: SessionAuthorizer(session: session))
            let output = try await client.AspNetUsersGetItem(path: .init(id: keys[0]))
            guard case .ok(let ok) = output else { throw APIFailure.from(status: 0) }
            let item = try ok.body.json
            firstName = item.firstName ?? ""
            lastName = item.lastName ?? ""
            permissionGroupName = item.permissionGroupName ?? ""
            userName = item.userName ?? ""
            normalizedUserName = item.normalizedUserName ?? ""
            email = item.email ?? ""
            normalizedEmail = item.normalizedEmail ?? ""
            emailConfirmed = item.emailConfirmed ?? false
            phoneNumber = item.phoneNumber ?? ""
            phoneNumberConfirmed = item.phoneNumberConfirmed ?? false
            twoFactorEnabled = item.twoFactorEnabled ?? false
            lockoutEnd = item.lockoutEnd ?? Date()
            lockoutEnabled = item.lockoutEnabled ?? false
            accessFailedCount = item.accessFailedCount.map { PortalNumber.integer($0) } ?? ""
            photoUrl = item.photoUrl ?? ""
        } catch {
            failure = PortalErrors.record(error)
        }
        loaded = true
    }}