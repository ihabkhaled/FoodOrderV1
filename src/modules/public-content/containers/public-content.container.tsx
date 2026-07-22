import '../public-content.css';

import { PublicFooter } from '../components/public-footer.component';
import { PublicHeader } from '../components/public-header.component';
import { PublicPage } from '../components/public-page.component';
import { PublicSystemPage } from '../components/public-system-page.component';
import { usePublicContent } from '../hooks/use-public-content.hook';
import type { PublicContentContainerProps } from '../types/public-content.types';

export function PublicContentContainer({
  applicationPath,
}: PublicContentContainerProps) {
  const viewModel = usePublicContent();
  return (
    <div
      className="public-site"
      role="document"
      aria-label={viewModel.site.brandName}
      lang={viewModel.locale.htmlLang}
      dir={viewModel.locale.direction}
      data-ad-eligible={viewModel.page?.definition.adEligible ? 'true' : 'false'}
    >
      <PublicHeader
        brandName={viewModel.site.brandName}
        homePath={viewModel.homePath}
        applicationPath={applicationPath}
        currentLocaleLabel={viewModel.locale.label}
        navigationItems={viewModel.navigationItems}
        localeLinks={viewModel.localeLinks}
        ui={viewModel.ui}
      />
      {viewModel.page ? (
        <PublicPage
          definition={viewModel.page.definition}
          copy={viewModel.page.copy}
          applicationPath={applicationPath}
          learnMorePath={viewModel.learnMorePath}
          ui={viewModel.ui}
        />
      ) : viewModel.systemPage ? (
        <PublicSystemPage
          copy={viewModel.systemPage.copy}
          homePath={viewModel.homePath}
          ui={viewModel.ui}
        />
      ) : null}
      <PublicFooter
        brandName={viewModel.site.brandName}
        homePath={viewModel.homePath}
        items={viewModel.footerItems}
        ui={viewModel.ui}
      />
    </div>
  );
}
