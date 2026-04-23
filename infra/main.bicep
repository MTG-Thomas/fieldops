param location string = resourceGroup().location
param appName string = 'fieldops'
param staticSiteSku string = 'Free'
param storageSku string = 'Standard_LRS'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${appName}storage${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: storageSku
  }
  kind: 'StorageV2'
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
output storageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storage.listKeys().keys[0].value}'
output appInsightsConnectionString string = insights.properties.ConnectionString
