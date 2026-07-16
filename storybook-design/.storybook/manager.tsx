import { addons } from 'storybook/manager-api';
import { themes } from 'storybook/theming';

import './breakpoint-toolbar';

addons.setConfig({
    theme: themes.light,
});
