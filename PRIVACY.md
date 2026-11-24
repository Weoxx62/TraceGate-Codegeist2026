# Privacy Policy — TraceGate

**Effective Date:** November 24, 2026  
**Publisher:** Julien Taverne (`Weoxx62`) · [julientaverne62@gmail.com](mailto:julientaverne62@gmail.com)

---

## 1. Zero External Data Egress (*Runs on Atlassian*)

TraceGate is built 100% on the **Atlassian Forge** serverless platform with **no external servers, no third-party analytics, and no external LLM API calls**. All application logic executes strictly within Atlassian's Forge runtime and your Atlassian Cloud site boundary.

## 2. Data Accessed & Stored

- **Atlassian Product Context**: When authorized by a site administrator, TraceGate reads and updates Jira issues, issue links, transitions, comments, and optional Confluence pages strictly within the installing tenant using scoped Forge OAuth tokens (`read:jira-work`, `write:jira-work`, `read:jira-user`, and optional Confluence page/space scopes).
- **Tenant-Isolated Storage**: Normalized requirement hashes, traceability graph edges, and SHA-256 tamper-evident audit ledger entries are persisted exclusively inside Atlassian-managed **Forge SQL** and **Forge KVS** scoped to your Atlassian Cloud installation ID.
- **No Independent Personal Data Storage**: TraceGate does not replicate or store user profiles, email addresses, or personal data outside Atlassian Cloud.

## 3. Data Retention & Deletion

Uninstalling TraceGate from your Atlassian Cloud site removes app-level access immediately, and Forge-hosted app storage is governed by Atlassian Cloud's tenant lifecycle and deletion policies.

## 4. Contact

For privacy or support inquiries, please contact [julientaverne62@gmail.com](mailto:julientaverne62@gmail.com) or open an issue at https://github.com/Weoxx62/TraceGate-Codegeist2026/issues.
