import AppLayout from "../layouts/AppLayout";
import {
  activeMessages,
  messageDocuments,
  messageLinks,
  messageMedia,
  messageThreads,
} from "../data/navigation";

function MessagesPage() {
  return (
    <AppLayout title="Messages" subtitle="Manage patient and staff conversations">
      <main className="messages-page">
        <section className="panel messages-shell">
          <aside className="messages-list-panel">
            <div className="messages-search-row">
              <label className="messages-search">
                <input type="search" placeholder="Search name, chat, etc" />
                <span aria-hidden="true">Q</span>
              </label>
              <button className="messages-add-button" type="button">+</button>
            </div>

            <div className="messages-thread-list">
              {messageThreads.map((thread) => (
                <article className={`messages-thread${thread.active ? " is-active" : ""}`} key={thread.name}>
                  <span className="table-avatar">{thread.initials}</span>
                  <div className="messages-thread__body">
                    <div className="messages-thread__head">
                      <strong>{thread.name}</strong>
                      <span>{thread.time}</span>
                    </div>
                    <p>{thread.preview}</p>
                  </div>
                  {thread.unread ? <span className="messages-thread__badge">{thread.unread}</span> : null}
                </article>
              ))}
            </div>
          </aside>

          <section className="messages-chat-panel">
            <div className="messages-chat-head">
              <div className="messages-chat-user">
                <span className="table-avatar">ES</span>
                <div>
                  <strong>Erica Smith</strong>
                  <p>last seen recently</p>
                </div>
              </div>
              <div className="messages-chat-actions">
                <button type="button" aria-label="Video call">◫</button>
                <button type="button" aria-label="Call">⌁</button>
                <button type="button" aria-label="More">...</button>
              </div>
            </div>

            <div className="messages-chat-date">March 6, 2028</div>

            <div className="messages-bubble-list">
              {activeMessages.map((message, index) => (
                <article className={`message-bubble-row${message.incoming ? " is-incoming" : " is-outgoing"}`} key={`${message.time}-${index}`}>
                  {message.incoming ? <span className="table-avatar">ES</span> : null}
                  <div className={`message-bubble${message.incoming ? " message-bubble--incoming" : ""}`}>
                    <p>{message.text}</p>
                    <small>{message.time}</small>
                  </div>
                </article>
              ))}
            </div>

            <div className="messages-input-row">
              <button type="button" aria-label="Emoji">◌</button>
              <input type="text" placeholder="Type a message..." />
              <button type="button" aria-label="Attach">⌁</button>
              <button className="messages-send-button" type="button" aria-label="Send">➤</button>
            </div>
          </section>

          <aside className="messages-info-panel">
            <div className="messages-info-head">
              <h3>Account Info</h3>
              <button type="button" aria-label="Close info">×</button>
            </div>

            <div className="messages-profile-card">
              <div className="messages-profile-photo" />
              <strong>Erica Smith</strong>
              <p>last seen recently</p>
            </div>

            <div className="messages-info-block">
              <small>About</small>
              <p>
                Follow-up dermatology patient under acne treatment, monitoring skin reaction and progress with regular online and in-person consultations.
              </p>
            </div>

            <div className="messages-info-block">
              <div className="messages-info-block__head">
                <small>Media (2)</small>
                <button type="button">Show All</button>
              </div>
              <div className="messages-media-tabs">
                <button type="button" className="is-active">Image (2)</button>
                <button type="button">Video</button>
                <button type="button">Audio</button>
              </div>
              <div className="messages-media-grid">
                {messageMedia.map((item) => (
                  <div className="messages-media-thumb" key={item} aria-label={item} />
                ))}
              </div>
            </div>

            <div className="messages-info-block">
              <div className="messages-info-block__head">
                <small>Documents (3)</small>
                <button type="button">Show All</button>
              </div>
              <div className="messages-doc-list">
                {messageDocuments.map((item) => (
                  <article className="messages-doc-item" key={item}>
                    <span className="messages-doc-icon" aria-hidden="true" />
                    <strong>{item}</strong>
                  </article>
                ))}
              </div>
            </div>

            <div className="messages-info-block">
              <div className="messages-info-block__head">
                <small>Links (3)</small>
                <button type="button">Show All</button>
              </div>
              <div className="messages-link-list">
                {messageLinks.map((item) => (
                  <article className="messages-link-item" key={item}>
                    <a href={item}>{item}</a>
                    <span aria-hidden="true">↗</span>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </AppLayout>
  );
}

export default MessagesPage;
