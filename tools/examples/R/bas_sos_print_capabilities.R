#!/usr/bin/Rscript

library(sos4R);

sos <- SOS(url = 'http://pdcdev:8080/52nSOSv3.5.0/sos');

# sosUrl(sos);
# sosVersion(sos);
# sosServiceProvider(sos);
# sosServiceIdentification(sos);
# sosAbstract(sos);
# sosOperations(sos);
# sosOfferings(sos);
# sosFeaturesOfInterest(sos);
# sosProcedures(sos);
# sosObservedProperties(sos);
# sosTimeFormat(sos);
# sosFilter_Capabilities(sos);
# sosResultModels(sos);
# sosResponseFormats(sos);

#caps <- getCapabilities(sos=sos);
#caps;
#summary(caps);

#sosCaps(sos=sos);
#sosContents(sos=sos);

sosCapabilitiesDocumentOriginal(sos=sos);

