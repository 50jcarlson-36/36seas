# Pricing grid correction
Owner reports misplaced paid plans and requests full-width free strip with paid plans below. The compatibility anchor #plans inadvertently became a fifth grid item. Move it before the grid; retain #membership-plans, four plan cards, billing behavior, prices, and full-width free band. No business logic or architectural changes. Verify card rows and full-width strip at mobile/tablet/desktop plus annual toggle. Authorized live correction continues release workflow. Rollback: revert to 9aeb853.

Owner also requested all header elements on one line. Desktop author actions now sit side by side with compact equal-height controls and wider header container. Mobile menu retains stacked actions. Verify 1280/1440/1920 desktop without overflow or overlaps.
