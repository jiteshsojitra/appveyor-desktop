
# Using Zimbra's Built-in Proxy

Declare the allowed domains (hostnames) in your Zimlet's config.xml:

```xml
<zimletConfig name="com_zimbra_openalldomains" version="1.0">
	<global>
		<property name="allowedDomains">*</property>
	</global>
</zimletConfig>
```

... then access proxied HTTP resources using the service URI:

```js
zimbra.request('/service/proxy?target=example.com').then( ... );
```


# Resource Consolidation

Zimbra handles resource consolidation for Zimlets.

All combined JavaScript for zimlets available to a given <abbr title="Class of Service">COS</abbr> is available from this URL:

`/service/zimlet/res/Zimlets-nodev_all.(css|js.zgz)?language=${LANG}&country=${COUNTRY_CODE}&cosId=${CLASS_OF_SERVICE}`

#### Example JavaScript request:

```
/service/zimlet/res/Zimlets-nodev_all.js.zgz?language=en&country=CA&cosId=e00428a1-0c00-11d9-836a-000d93afea2a
```

#### Example CSS request:

```
/service/zimlet/res/Zimlets-nodev_all.css?language=en&country=CA&cosId=e00428a1-0c00-11d9-836a-000d93afea2a
```


---

# Solutions

### Realms

Looks great, but relies on Reflect, which can't be adequately polyfilled for IE11.

> https://github.com/tc39/proposal-realms
