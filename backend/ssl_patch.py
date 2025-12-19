def patch_ssl_for_windows_truststore():
    try:
        import truststore
        truststore.inject_into_ssl()
        print("✅ truststore injected into ssl (Windows cert store)")
    except Exception as e:
        print("⚠️ truststore not active:", e)
