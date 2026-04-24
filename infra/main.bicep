param location string = resourceGroup().location
param appName string = 'fieldops'
param staticSiteSku string = 'Free'
param storageSku string = 'Standard_LRS'

var normalizedAppName = replace(toLower(appName), '-', '')
var storageName = '${substring(normalizedAppName, 0, min(length(normalizedAppName), 9))}st${uniqueString(resourceGroup().id)}'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: {
    name: storageSku
  }
  kind: 'StorageV2'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    encryption: {
      keySource: 'Microsoft.Storage'
      services: {
        blob: {
          enabled: true
        }
        file: {
          enabled: true
        }
        queue: {
          enabled: true
        }
        table: {
          enabled: true
        }
      }
    }
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appName}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
    SamplingPercentage: 25
  }
}

resource staticSite 'Microsoft.Web/staticSites@2023-12-01' = {
  name: appName
  location: location
  sku: {
    name: staticSiteSku
    tier: staticSiteSku
  }
  properties: {
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}

output staticSiteName string = staticSite.name
output defaultHostname string = staticSite.properties.defaultHostname
output storageAccountName string = storage.name
output appInsightsConnectionString string = insights.properties.ConnectionString
